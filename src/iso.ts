// Isometric coordinate utilities
export const TILE_W = 64;
export const TILE_H = 32;

export function toIso(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

export function toGrid(ix: number, iy: number): { gx: number; gy: number } {
  return {
    gx: (ix / (TILE_W / 2) + iy / (TILE_H / 2)) / 2,
    gy: (iy / (TILE_H / 2) - ix / (TILE_W / 2)) / 2,
  };
}

// Draw a flat isometric tile
export function drawTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  fill: string,
  stroke = 'rgba(0,0,0,0.3)',
  elevation = 0
): void {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const ey = sy - elevation;
  ctx.beginPath();
  ctx.moveTo(sx, ey - hh);
  ctx.lineTo(sx + hw, ey);
  ctx.lineTo(sx, ey + hh);
  ctx.lineTo(sx - hw, ey);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Draw a box (tile + walls) for elevated objects
export function drawBox(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  h: number,
  topColor: string,
  leftColor: string,
  rightColor: string
): void {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;

  // Left wall
  ctx.beginPath();
  ctx.moveTo(sx - hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx, sy + hh + h);
  ctx.lineTo(sx - hw, sy + h);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Right wall
  ctx.beginPath();
  ctx.moveTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx, sy + hh + h);
  ctx.lineTo(sx + hw, sy + h);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.stroke();

  // Top face
  drawTile(ctx, sx, sy - h, topColor, 'rgba(0,0,0,0.2)', 0);
}
