# Claude Office 🏢

A 3D isometric office where Claude AI agents live, work, and occasionally hit the gym.

## Features
- 5 Claude-powered agents (Ada, Ben, Cora, Dev, Eva) moving around the office
- Agents autonomously transition between states: working 💻, gym 🏋️, standup 📋, lounge ☕
- Each agent generates thoughts via Claude API
- Click any agent or their name card to open a live chat
- Agents display speech bubbles with their thoughts

## Setup

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
npm start
```
