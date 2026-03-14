import Anthropic from '@anthropic-ai/sdk';
import type { Agent } from './agent';

const API_KEY = (typeof process !== 'undefined' && process.env?.ANTHROPIC_API_KEY) || '';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
}

// Autonomous thought — called periodically for an agent
export async function generateThought(agent: Agent): Promise<string> {
  const c = getClient();
  const stateContext = getStateContext(agent);

  try {
    const response = await c.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 80,
      system: `${agent.personality}
You are currently ${stateContext}.
Respond with a SHORT thought or observation (1-2 sentences, max 15 words).
Be in-character and make it feel natural and human. No quotes.`,
      messages: [{ role: 'user', content: 'What are you thinking right now?' }],
    });

    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
  } catch (err) {
    console.warn('Claude thought error:', err);
  }
  return '';
}

// Chat with a specific agent
export async function chatWithAgent(
  agent: Agent,
  userMessage: string
): Promise<string> {
  const c = getClient();
  const stateContext = getStateContext(agent);

  // Build message history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of agent.chatHistory.slice(-8)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await c.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      system: `${agent.personality}
You are currently ${stateContext} in the Claude HQ office.
Keep responses conversational and in-character. Be friendly but concise (2-3 sentences max).`,
      messages,
    });

    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
  } catch (err) {
    console.warn('Claude chat error:', err);
    return `[${agent.name} is away from keyboard]`;
  }
  return '';
}

// Generate a standup update
export async function generateStandupUpdate(agent: Agent): Promise<string> {
  const c = getClient();
  try {
    const response = await c.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 60,
      system: `${agent.personality} You are giving a quick standup update.`,
      messages: [{ role: 'user', content: 'Give a one-sentence standup update about what you are working on today.' }],
    });
    for (const block of response.content) {
      if (block.type === 'text') return block.text.trim();
    }
  } catch (err) {
    console.warn('Standup error:', err);
  }
  return '';
}

function getStateContext(agent: Agent): string {
  switch (agent.state) {
    case 'working': return 'sitting at your desk working on a project';
    case 'gym': return 'working out in the office gym, exercising and training';
    case 'standup': return 'at the standup meeting area with your team';
    case 'lounge': return 'relaxing in the office lounge with a coffee';
    case 'walking': return 'walking through the office';
    case 'idle': return 'taking a short break, just standing around';
    default: return 'in the office';
  }
}
