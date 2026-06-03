import type { Vector2 } from './physics';

// Re-defining properly based on standard 1-2-4-8 weights for TL, TR, BR, BL:
// 1: TL, 2: TR, 4: BR, 8: BL
const MS_EDGES = [
  [], // 0
  [[0, 0.5, 0.5, 0]], // 1 (TL) -> Left to Top
  [[0.5, 0, 1, 0.5]], // 2 (TR) -> Top to Right
  [[0, 0.5, 1, 0.5]], // 3 (TL, TR) -> Left to Right
  [[0.5, 1, 1, 0.5]], // 4 (BR) -> Bottom to Right
  [[0, 0.5, 0.5, 1], [0.5, 0, 1, 0.5]], // 5 (TL, BR) -> Saddle
  [[0.5, 0, 0.5, 1]], // 6 (TR, BR) -> Top to Bottom
  [[0, 0.5, 0.5, 1]], // 7 (TL, TR, BR) -> Left to Bottom
  [[0, 0.5, 0.5, 1]], // 8 (BL) -> Left to Bottom
  [[0.5, 0, 0.5, 1]], // 9 (TL, BL) -> Top to Bottom
  [[0, 0.5, 0.5, 0], [0.5, 1, 1, 0.5]], // 10 (TR, BL) -> Saddle
  [[0.5, 1, 1, 0.5]], // 11 (TL, TR, BL) -> Bottom to Right
  [[0, 0.5, 1, 0.5]], // 12 (BR, BL) -> Left to Right
  [[0.5, 0, 1, 0.5]], // 13 (TL, BR, BL) -> Top to Right
  [[0, 0.5, 0.5, 0]], // 14 (TR, BR, BL) -> Left to Top
  []  // 15
];

export interface LineSegment {
  p1: Vector2;
  p2: Vector2;
}

export function computeContours(
  grid: number[][],
  thresholds: number[],
  cellWidth: number,
  cellHeight: number
): { lines: LineSegment[], value: number }[] {
  const result: { lines: LineSegment[], value: number }[] = [];
  const rows = grid.length;
  if (rows === 0) return result;
  const cols = grid[0].length;

  for (const t of thresholds) {
    const segments: LineSegment[] = [];
    
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const tl = grid[y][x];
        const tr = grid[y][x + 1];
        const bl = grid[y + 1][x];
        const br = grid[y + 1][x + 1];

        let state = 0;
        if (tl >= t) state |= 1;
        if (tr >= t) state |= 2;
        if (br >= t) state |= 4;
        if (bl >= t) state |= 8;

        let edges = MS_EDGES[state];
        
        // Handle Saddle Points Ambiguity
        if (state === 5 || state === 10) {
          const avg = (tl + tr + bl + br) / 4;
          if (state === 5) {
            // TL, BR are IN. If center is IN, connect (Left, Top) and (Right, Bottom)
            // If center is OUT, connect (Left, Bottom) and (Right, Top)
            if (avg >= t) edges = [[0, 0.5, 0.5, 0], [0.5, 1, 1, 0.5]]; 
            else edges = [[0, 0.5, 0.5, 1], [0.5, 0, 1, 0.5]];
          } else {
            // TR, BL are IN.
            if (avg >= t) edges = [[0.5, 0, 1, 0.5], [0, 0.5, 0.5, 1]];
            else edges = [[0, 0.5, 0.5, 0], [0.5, 1, 1, 0.5]];
          }
        }

        for (const edge of edges) {
          // edge is [x1, y1, x2, y2] in relative cell coords [0-1]
          
          // Better interpolation
          const getT = (v1: number, v2: number) => {
            if (v1 === v2) return 0.5;
            return (t - v1) / (v2 - v1);
          };

          let x1 = edge[0]; let y1 = edge[1];
          let x2 = edge[2]; let y2 = edge[3];

          // Interpolate if it's on an edge
          if (y1 === 0) x1 = getT(tl, tr);
          else if (y1 === 1) x1 = getT(bl, br);
          else if (x1 === 0) y1 = getT(tl, bl);
          else if (x1 === 1) y1 = getT(tr, br);

          if (y2 === 0) x2 = getT(tl, tr);
          else if (y2 === 1) x2 = getT(bl, br);
          else if (x2 === 0) y2 = getT(tl, bl);
          else if (x2 === 1) y2 = getT(tr, br);

          segments.push({
            p1: { x: (x + x1) * cellWidth, y: (y + y1) * cellHeight },
            p2: { x: (x + x2) * cellWidth, y: (y + y2) * cellHeight }
          });
        }
      }
    }
    
    if (segments.length > 0) {
      result.push({ lines: segments, value: t });
    }
  }

  return result;
}
