import { Tile, GRID_W, GRID_H } from './office';

interface Node {
  gx: number; gy: number;
  g: number; h: number; f: number;
  parent: Node | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function findPath(
  grid: Tile[][],
  sx: number, sy: number,
  ex: number, ey: number
): Array<{ gx: number; gy: number }> {
  if (sx === ex && sy === ey) return [];

  const open: Node[] = [];
  const closed = new Set<string>();
  const key = (n: Node) => `${n.gx},${n.gy}`;

  open.push({ gx: sx, gy: sy, g: 0, h: heuristic(sx, sy, ex, ey), f: heuristic(sx, sy, ex, ey), parent: null });

  const dirs = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  ];

  let iterations = 0;
  while (open.length > 0 && iterations++ < 2000) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    if (cur.gx === ex && cur.gy === ey) {
      const path: Array<{ gx: number; gy: number }> = [];
      let n: Node | null = cur;
      while (n) { path.unshift({ gx: n.gx, gy: n.gy }); n = n.parent; }
      return path.slice(1);
    }
    closed.add(key(cur));

    for (const { dx, dy } of dirs) {
      const nx = cur.gx + dx, ny = cur.gy + dy;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      const tile = grid[ny][nx];
      // Allow walking to destination even if not walkable (standing next to desk)
      if (!tile.walkable && !(nx === ex && ny === ey)) continue;
      const nk = `${nx},${ny}`;
      if (closed.has(nk)) continue;
      const g = cur.g + 1;
      const h = heuristic(nx, ny, ex, ey);
      const existing = open.find(n => n.gx === nx && n.gy === ny);
      if (!existing || g < existing.g) {
        if (existing) open.splice(open.indexOf(existing), 1);
        open.push({ gx: nx, gy: ny, g, h, f: g + h, parent: cur });
      }
    }
  }
  return [];
}
