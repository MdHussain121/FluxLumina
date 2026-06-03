export interface Charge {
  id: string;
  x: number;
  y: number;
  q: number; // in nC, where >0 is positive, <0 is negative
  vx?: number;
  vy?: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// K is a scaled version of the Coulomb constant (8.99e9 N·m²/C²)
// We use 1000 here to ensure field magnitudes and potentials map well to screen pixels.
const K = 1000;

export function getPotential(p: Vector2, charges: Charge[]): number {
  let v = 0;
  for (const charge of charges) {
    const dx = p.x - charge.x;
    const dy = p.y - charge.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
    v += (K * charge.q) / dist;
  }
  return v;
}

export function getElectricField(p: Vector2, charges: Charge[]): Vector2 {
  let ex = 0;
  let ey = 0;
  for (const charge of charges) {
    const dx = p.x - charge.x;
    const dy = p.y - charge.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq) || 0.1;
    const mag = (K * charge.q) / distSq;
    ex += mag * (dx / dist);
    ey += mag * (dy / dist);
  }
  return { x: ex, y: ey };
}

// Runge-Kutta 4th Order for tracing a field line from a starting point
export function traceFieldLine(
  start: Vector2,
  charges: Charge[],
  stepSize: number,
  maxSteps: number,
  direction: 1 | -1, // 1 for following E field, -1 for opposite
  bounds?: { minX: number, minY: number, maxX: number, maxY: number }
): Vector2[] {
  const path: Vector2[] = [start];
  let current = { ...start };

  for (let i = 0; i < maxSteps; i++) {
    // We want to follow the normalized E field direction
    const getDir = (pos: Vector2) => {
      const e = getElectricField(pos, charges);
      const mag = Math.sqrt(e.x * e.x + e.y * e.y) || 1;
      return { x: (e.x / mag) * direction, y: (e.y / mag) * direction };
    };

    const k1 = getDir(current);
    const k2 = getDir({ x: current.x + 0.5 * stepSize * k1.x, y: current.y + 0.5 * stepSize * k1.y });
    const k3 = getDir({ x: current.x + 0.5 * stepSize * k2.x, y: current.y + 0.5 * stepSize * k2.y });
    const k4 = getDir({ x: current.x + stepSize * k3.x, y: current.y + stepSize * k3.y });

    current = {
      x: current.x + (stepSize / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: current.y + (stepSize / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y)
    };

    path.push({ ...current });
    
    // Stop if we leave the reasonable area (performance)
    if (bounds) {
      if (current.x < bounds.minX || current.x > bounds.maxX || 
          current.y < bounds.minY || current.y > bounds.maxY) {
        break;
      }
    }

    // Stop if we hit a charge (singularity)
    let hitCharge = false;
    for (const c of charges) {
      const dx = current.x - c.x;
      const dy = current.y - c.y;
      if (dx * dx + dy * dy < 400) { // radius 20
        hitCharge = true;
        break;
      }
    }
    if (hitCharge) break;
  }

  return path;
}
