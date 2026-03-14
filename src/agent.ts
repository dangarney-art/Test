import { toIso, TILE_W, TILE_H } from './iso';
import { Tile, GRID_W, GRID_H, POI, ZONES } from './office';
import { findPath } from './pathfind';

export type AgentState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'gym'
  | 'standup'
  | 'lounge'
  | 'thinking';

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

export interface Agent {
  id: string;
  name: string;
  color: string;
  gx: number;
  gy: number;
  // Smooth position for rendering
  px: number;
  py: number;
  state: AgentState;
  path: Array<{ gx: number; gy: number }>;
  targetGx: number;
  targetGy: number;
  moveTimer: number;
  stateTimer: number;
  stateDuration: number;
  chatHistory: ChatMessage[];
  isThinking: boolean;
  speechBubble: string;
  speechTimer: number;
  deskIdx: number;
  personality: string;
}

const AGENT_CONFIGS = [
  { name: 'Ada', color: '#e060a0', personality: 'You are Ada, an enthusiastic AI researcher who loves experimenting with new ideas. You are working in the Claude HQ office.' },
  { name: 'Ben', color: '#60a0e0', personality: 'You are Ben, a thoughtful software engineer who writes clean, well-documented code. You are working in the Claude HQ office.' },
  { name: 'Cora', color: '#60e0a0', personality: 'You are Cora, a product manager who is great at communicating complex ideas simply. You are working in the Claude HQ office.' },
  { name: 'Dev', color: '#e0a060', personality: 'You are Dev, a data scientist who loves finding patterns in data. You are working in the Claude HQ office.' },
  { name: 'Eva', color: '#a060e0', personality: 'You are Eva, a UX designer who cares deeply about user experience and accessibility. You are working in the Claude HQ office.' },
];

export function createAgents(): Agent[] {
  return AGENT_CONFIGS.map((cfg, i) => {
    const desk = POI.desks[i % POI.desks.length];
    const startGx = Math.max(0, desk.gx - 1);
    const startGy = desk.gy;
    return {
      id: `agent_${i}`,
      name: cfg.name,
      color: cfg.color,
      gx: startGx,
      gy: startGy,
      px: startGx,
      py: startGy,
      state: 'working',
      path: [],
      targetGx: startGx,
      targetGy: startGy,
      moveTimer: 0,
      stateTimer: 0,
      stateDuration: 200 + Math.random() * 400,
      chatHistory: [],
      isThinking: false,
      speechBubble: '',
      speechTimer: 0,
      deskIdx: i,
      personality: cfg.personality,
    };
  });
}

function pickNextState(agent: Agent): { state: AgentState; gx: number; gy: number } {
  const r = Math.random();

  // Go to gym occasionally
  if (r < 0.2) {
    const spot = POI.gym_spots[Math.floor(Math.random() * POI.gym_spots.length)];
    return { state: 'gym', gx: spot.gx, gy: spot.gy };
  }
  // Standup
  if (r < 0.3) {
    return { state: 'standup', gx: POI.standup.gx, gy: POI.standup.gy };
  }
  // Lounge
  if (r < 0.4) {
    const spot = POI.lounge[Math.floor(Math.random() * POI.lounge.length)];
    return { state: 'lounge', gx: spot.gx, gy: spot.gy };
  }
  // Back to desk
  const desk = POI.desks[agent.deskIdx % POI.desks.length];
  return { state: 'working', gx: Math.max(0, desk.gx - 1), gy: desk.gy };
}

export function updateAgent(agent: Agent, grid: Tile[][], dt: number): void {
  agent.stateTimer += dt;
  if (agent.speechTimer > 0) {
    agent.speechTimer -= dt;
    if (agent.speechTimer <= 0) agent.speechBubble = '';
  }

  // Walking logic
  if (agent.path.length > 0) {
    agent.moveTimer += dt;
    const MOVE_SPEED = 8; // frames per tile
    if (agent.moveTimer >= MOVE_SPEED) {
      agent.moveTimer = 0;
      const next = agent.path.shift()!;
      agent.gx = next.gx;
      agent.gy = next.gy;
    }
    // Smooth interpolation
    const progress = Math.min(agent.moveTimer / 8, 1);
    if (agent.path.length > 0) {
      const next = agent.path[0];
      agent.px = agent.gx + (next.gx - agent.gx) * progress;
      agent.py = agent.gy + (next.gy - agent.gy) * progress;
    } else {
      agent.px = agent.gx;
      agent.py = agent.gy;
    }
    return;
  }

  agent.px = agent.gx;
  agent.py = agent.gy;

  // State transitions
  if (agent.isThinking) return; // Don't change state while Claude is responding

  if (agent.stateTimer >= agent.stateDuration) {
    agent.stateTimer = 0;
    agent.stateDuration = 150 + Math.random() * 500;

    const next = pickNextState(agent);
    agent.targetGx = next.gx;
    agent.targetGy = next.gy;

    if (next.gx !== agent.gx || next.gy !== agent.gy) {
      agent.path = findPath(grid, agent.gx, agent.gy, next.gx, next.gy);
      if (agent.path.length > 0) {
        agent.state = 'walking';
      } else {
        agent.state = next.state;
      }
    } else {
      agent.state = next.state;
    }
  }

  // Arrived at destination
  if (agent.gx === agent.targetGx && agent.gy === agent.targetGy && agent.path.length === 0) {
    const next = pickNextState(agent);
    if (agent.state === 'walking') {
      const desk = POI.desks[agent.deskIdx % POI.desks.length];
      const atDesk = agent.gx === Math.max(0, desk.gx - 1) && agent.gy === desk.gy;
      const atGym = ZONES.gym.x <= agent.gx;
      if (atGym) agent.state = 'gym';
      else if (atDesk) agent.state = 'working';
      else agent.state = 'idle';
    }
  }
}

const STATE_ICONS: Record<AgentState, string> = {
  idle: '💭',
  walking: '🚶',
  working: '💻',
  gym: '🏋️',
  standup: '📋',
  lounge: '☕',
  thinking: '🤔',
};

export function renderAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  offsetX: number,
  offsetY: number,
  selected: boolean
): void {
  const { x, y } = toIso(agent.px, agent.py);
  const sx = x + offsetX;
  const sy = y + offsetY;

  const HEAD_R = 10;
  const BODY_H = 16;

  // Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 12, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.restore();

  // Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx - 7, sy - 2);
  ctx.lineTo(sx + 7, sy - 2);
  ctx.lineTo(sx + 5, sy - 2 - BODY_H);
  ctx.lineTo(sx - 5, sy - 2 - BODY_H);
  ctx.closePath();
  ctx.fillStyle = agent.color;
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(sx, sy - 2 - BODY_H - HEAD_R, HEAD_R, 0, Math.PI * 2);
  ctx.fillStyle = lighten(agent.color, 0.3);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // Name label
  ctx.save();
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  const nameY = sy - 2 - BODY_H - HEAD_R * 2 - 4;

  if (selected) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const tw = ctx.measureText(agent.name).width;
    ctx.fillRect(sx - tw / 2 - 3, nameY - 10, tw + 6, 13);
  }
  ctx.fillStyle = '#fff';
  ctx.fillText(agent.name, sx, nameY);

  // State icon
  ctx.font = '11px serif';
  ctx.fillText(STATE_ICONS[agent.state], sx, nameY - 12);

  // Speech bubble
  if (agent.speechBubble) {
    const lines = wrapText(agent.speechBubble, 120);
    const bw = 130;
    const bh = lines.length * 14 + 10;
    const bx = sx + 14;
    const by = nameY - bh - 14;

    ctx.fillStyle = 'rgba(240,230,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = agent.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(bx, by + bh - 10);
    ctx.lineTo(sx + 8, nameY - 10);
    ctx.lineTo(bx + 10, by + bh - 6);
    ctx.fillStyle = 'rgba(240,230,255,0.95)';
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + 6, by + 14 + i * 14);
    });
  }

  // Thinking dots
  if (agent.isThinking) {
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    const dots = '.'.repeat((Math.floor(Date.now() / 400) % 3) + 1);
    ctx.fillStyle = agent.color;
    ctx.fillText(dots, sx, nameY - 26);
  }

  ctx.restore();
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr},${lg},${lb})`;
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length * 5.5 > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5); // max 5 lines
}
