import { buildGrid, renderOffice, GRID_W, GRID_H } from './office';
import { createAgents, updateAgent, renderAgent, Agent } from './agent';
import { toIso, TILE_W, TILE_H } from './iso';
import { generateThought, chatWithAgent, generateStandupUpdate } from './claude';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Resize canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// World setup
const grid = buildGrid();
const agents = createAgents();
let selectedAgent: Agent | null = null;
let tick = 0;

// Camera: center the grid
function getOffset() {
  // Center of grid in iso space
  const { x: cx, y: cy } = toIso(GRID_W / 2, GRID_H / 2);
  return {
    offX: canvas.width / 2 - cx,
    offY: canvas.height * 0.4 - cy,
  };
}

// --- UI ---
const agentListEl = document.getElementById('agent-list')!;
const chatMessages = document.getElementById('chat-messages')!;
const chatAgentName = document.getElementById('chat-agent-name')!;
const chatAgentStatus = document.getElementById('chat-agent-status')!;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const chatSend = document.getElementById('chat-send') as HTMLButtonElement;
const statsEl = document.getElementById('stats')!;

function updateAgentList() {
  agentListEl.innerHTML = '';
  for (const agent of agents) {
    const card = document.createElement('div');
    card.className = 'agent-card' + (agent === selectedAgent ? ' selected' : '');
    const stateLabels: Record<string, string> = {
      working: 'Working',
      gym: 'At the Gym 🏋️',
      standup: 'In Standup',
      lounge: 'In Lounge',
      walking: 'Walking',
      idle: 'Idle',
      thinking: 'Thinking',
    };
    card.innerHTML = `
      <div class="agent-name">
        <span class="agent-dot" style="background:${agent.color}"></span>${agent.name}
      </div>
      <div class="agent-state">${stateLabels[agent.state] || agent.state}</div>
    `;
    card.addEventListener('click', () => selectAgent(agent));
    agentListEl.appendChild(card);
  }
}

function selectAgent(agent: Agent) {
  selectedAgent = agent;
  chatAgentName.textContent = agent.name;
  chatAgentStatus.textContent = agent.state;
  renderChatHistory(agent);
  updateAgentList();
}

function renderChatHistory(agent: Agent) {
  chatMessages.innerHTML = '';
  for (const msg of agent.chatHistory) {
    addChatMessage(msg.role === 'user' ? 'user' : 'agent', msg.text, agent.name);
  }
}

function addChatMessage(role: 'user' | 'agent', text: string, agentName: string) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="name">${role === 'user' ? 'You' : agentName}</div>${escapeHtml(text)}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendChat() {
  if (!selectedAgent) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';

  selectedAgent.chatHistory.push({ role: 'user', text });
  addChatMessage('user', text, selectedAgent.name);

  const agent = selectedAgent;
  agent.isThinking = true;
  chatAgentStatus.innerHTML = '<span class="thinking-indicator">Thinking</span>';

  const response = await chatWithAgent(agent, text);
  agent.isThinking = false;

  if (response) {
    agent.chatHistory.push({ role: 'agent', text: response });
    agent.speechBubble = response.slice(0, 80);
    agent.speechTimer = 6000;
    if (selectedAgent === agent) {
      addChatMessage('agent', response, agent.name);
      chatAgentStatus.textContent = agent.state;
    }
  }
}

chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

// Canvas click to select agent
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const { offX, offY } = getOffset();

  for (const agent of agents) {
    const { x, y } = toIso(agent.px, agent.py);
    const sx = x + offX;
    const sy = y + offY;
    if (Math.hypot(mx - sx, my - (sy - 24)) < 20) {
      selectAgent(agent);
      return;
    }
  }
  selectedAgent = null;
  updateAgentList();
  chatAgentName.textContent = 'Select an agent to chat';
  chatAgentStatus.textContent = '';
  chatMessages.innerHTML = '';
});

// --- Autonomous thought scheduling ---
let thoughtTimers: Record<string, number> = {};
function scheduleThoughts() {
  for (const agent of agents) {
    if (!thoughtTimers[agent.id]) {
      // Each agent gets a thought every 15-30s, staggered
      thoughtTimers[agent.id] = window.setTimeout(() => {
        triggerThought(agent);
      }, 5000 + Math.random() * 20000);
    }
  }
}

async function triggerThought(agent: Agent) {
  if (agent.isThinking) {
    thoughtTimers[agent.id] = window.setTimeout(() => triggerThought(agent), 5000);
    return;
  }

  agent.isThinking = true;
  let thought = '';

  if (agent.state === 'standup') {
    thought = await generateStandupUpdate(agent);
  } else {
    thought = await generateThought(agent);
  }

  agent.isThinking = false;

  if (thought) {
    agent.speechBubble = thought.slice(0, 80);
    agent.speechTimer = 5000;
  }

  // Schedule next thought
  thoughtTimers[agent.id] = window.setTimeout(() => triggerThought(agent), 15000 + Math.random() * 20000);
}

// --- Render loop ---
let lastTime = 0;
function loop(ts: number) {
  const dt = ts - lastTime;
  lastTime = ts;
  tick++;

  const { offX, offY } = getOffset();

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0d0d1a');
  grad.addColorStop(1, '#1a1020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Office
  renderOffice(ctx, grid, offX, offY);

  // Update & render agents (back-to-front painter order)
  const sortedAgents = [...agents].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  for (const agent of sortedAgents) {
    updateAgent(agent, grid, 1);
  }
  for (const agent of sortedAgents) {
    renderAgent(ctx, agent, offX, offY, agent === selectedAgent);
  }

  // Stats
  statsEl.textContent = `Agents: ${agents.length} | Tick: ${tick} | ${agents.filter(a => a.state === 'gym').length} at gym`;

  // Agent list update every 30 frames
  if (tick % 30 === 0) updateAgentList();

  requestAnimationFrame(loop);
}

// Init
scheduleThoughts();
updateAgentList();
requestAnimationFrame(loop);
