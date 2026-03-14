import { toIso, drawTile, drawBox, TILE_W, TILE_H } from './iso';

export type TileType =
  | 'floor'
  | 'carpet'
  | 'gym_floor'
  | 'wall'
  | 'desk'
  | 'monitor'
  | 'treadmill'
  | 'weights'
  | 'couch'
  | 'plant'
  | 'ping_pong'
  | 'whiteboard'
  | 'window';

export interface Tile {
  type: TileType;
  walkable: boolean;
}

export const GRID_W = 20;
export const GRID_H = 20;

// Zone definitions
export const ZONES = {
  office: { x: 0, y: 0, w: 13, h: 20, label: 'OPEN OFFICE' },
  gym: { x: 13, y: 0, w: 7, h: 20, label: 'GYM' },
};

// Points of interest for agents
export const POI = {
  desks: [
    { gx: 2, gy: 2 }, { gx: 2, gy: 4 }, { gx: 2, gy: 6 },
    { gx: 5, gy: 2 }, { gx: 5, gy: 4 }, { gx: 5, gy: 6 },
    { gx: 8, gy: 2 }, { gx: 8, gy: 4 }, { gx: 8, gy: 6 },
    { gx: 2, gy: 10 }, { gx: 5, gy: 10 }, { gx: 8, gy: 10 },
  ],
  gym_spots: [
    { gx: 14, gy: 3 }, { gx: 15, gy: 3 }, { gx: 16, gy: 3 },
    { gx: 14, gy: 7 }, { gx: 15, gy: 7 }, { gx: 16, gy: 7 },
    { gx: 14, gy: 12 }, { gx: 15, gy: 12 },
  ],
  lounge: [
    { gx: 3, gy: 15 }, { gx: 4, gy: 15 }, { gx: 5, gy: 15 },
  ],
  standup: { gx: 6, gy: 13 },
  whiteboard: { gx: 10, gy: 8 },
};

export function buildGrid(): Tile[][] {
  const grid: Tile[][] = Array.from({ length: GRID_H }, () =>
    Array.from({ length: GRID_W }, () => ({ type: 'floor' as TileType, walkable: true }))
  );

  // Gym floor
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = ZONES.gym.x; gx < ZONES.gym.x + ZONES.gym.w; gx++) {
      grid[gy][gx] = { type: 'gym_floor', walkable: true };
    }
  }

  // Carpet in office seating area
  for (let gy = 12; gy < 18; gy++) {
    for (let gx = 0; gx < 13; gx++) {
      grid[gy][gx] = { type: 'carpet', walkable: true };
    }
  }

  // Desks (not walkable on desk tile itself)
  for (const d of POI.desks) {
    if (d.gx < GRID_W && d.gy < GRID_H) {
      grid[d.gy][d.gx] = { type: 'desk', walkable: false };
    }
  }

  // Treadmills
  for (const g of POI.gym_spots.slice(0, 3)) {
    grid[g.gy][g.gx] = { type: 'treadmill', walkable: false };
  }
  // Weights
  for (const g of POI.gym_spots.slice(3, 6)) {
    grid[g.gy][g.gx] = { type: 'weights', walkable: false };
  }

  // Whiteboard
  grid[POI.whiteboard.gy][POI.whiteboard.gx] = { type: 'whiteboard', walkable: false };

  // Ping pong
  grid[14][14] = { type: 'ping_pong', walkable: false };
  grid[14][15] = { type: 'ping_pong', walkable: false };

  // Plants
  grid[0][0] = { type: 'plant', walkable: false };
  grid[0][12] = { type: 'plant', walkable: false };
  grid[19][0] = { type: 'plant', walkable: false };
  grid[0][19] = { type: 'plant', walkable: false };

  return grid;
}

const COLORS = {
  floor: { top: '#c8b89a', left: '#a09070', right: '#b8a888' },
  carpet: { top: '#7a6090', left: '#5a4070', right: '#6a5080' },
  gym_floor: { top: '#4a5060', left: '#2a3040', right: '#3a4050' },
  desk: { top: '#c8a060', left: '#806020', right: '#a07030', h: 18 },
  treadmill: { top: '#505060', left: '#303040', right: '#404050', h: 14 },
  weights: { top: '#606060', left: '#404040', right: '#505050', h: 10 },
  whiteboard: { top: '#e8e8e8', left: '#a0a0a0', right: '#c0c0c0', h: 24 },
  ping_pong: { top: '#207040', left: '#104020', right: '#185030', h: 12 },
  plant: { top: '#406020', left: '#203010', right: '#304018', h: 28 },
  couch: { top: '#8060a0', left: '#503070', right: '#705090', h: 16 },
};

export function renderOffice(
  ctx: CanvasRenderingContext2D,
  grid: Tile[][],
  offsetX: number,
  offsetY: number
): void {
  // Draw in painter's order: back to front
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const { x, y } = toIso(gx, gy);
      const sx = x + offsetX;
      const sy = y + offsetY;
      const tile = grid[gy][gx];

      const c = COLORS[tile.type as keyof typeof COLORS] as {
        top: string; left: string; right: string; h?: number;
      } | undefined;
      if (!c) continue;

      if (c.h) {
        drawBox(ctx, sx, sy, c.h, c.top, c.left, c.right);
      } else {
        drawTile(ctx, sx, sy, c.top, 'rgba(0,0,0,0.2)');
      }
    }
  }

  // Zone labels
  drawZoneLabel(ctx, ZONES.office, offsetX, offsetY, 'rgba(200,180,255,0.4)');
  drawZoneLabel(ctx, ZONES.gym, offsetX, offsetY, 'rgba(100,200,100,0.4)');
}

function drawZoneLabel(
  ctx: CanvasRenderingContext2D,
  zone: { x: number; y: number; w: number; h: number; label: string },
  offX: number,
  offY: number,
  color: string
): void {
  // Find center of zone in iso
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const { x, y } = toIso(cx, cy);
  ctx.save();
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(zone.label, x + offX, y + offY - 30);
  ctx.restore();
}
