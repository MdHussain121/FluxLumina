import React, { useState, useEffect, useRef } from 'react';
import { getPotential, getElectricField, traceFieldLine } from './physics';
import type { Charge, Vector2 } from './physics';
import { computeContours } from './marchingSquares';
import { Plus, Minus, Settings, Eye, Zap, Info, BookOpen, ChevronDown } from 'lucide-react';

const VOLTAGE_THRESHOLDS = [-500, -200, -100, -50, -20, 20, 50, 100, 200, 500];

export default function App() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [charges, setCharges] = useState<Charge[]>(() => [
    { id: '1', x: window.innerWidth / 2 - 150, y: window.innerHeight / 2, q: 1 },
    { id: '2', x: window.innerWidth / 2 + 150, y: window.innerHeight / 2, q: -1 }
  ]);
  
  const [settings, setSettings] = useState({
    showVectors: true,
    showContours: true,
    showFieldLines: true,
    showHeatmap: false,
    simulateMotion: false,
    motionSpeed: 1,
    vectorDensity: 60, // pixels per vector
    contourGridSize: 10, // pixels per marching square cell
    showForceVectors: true,
  });

  const [mousePos, setMousePos] = useState<Vector2>({ x: 0, y: 0 });
  const [draggingCharge, setDraggingCharge] = useState<string | null>(null);
  const [hoverCharge, setHoverCharge] = useState<string | null>(null);
  const [pan, setPan] = useState<Vector2>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [started, setStarted] = useState(false);
  const [fps, setFps] = useState(0);
  const [showExperiments, setShowExperiments] = useState(true);
  
  const panRef = useRef<Vector2>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1);
  const needsBgRedraw = useRef<boolean>(true);
  const needsFgRedraw = useRef<boolean>(true);
  const chargesRef = useRef<Charge[]>([]);
  const lastStateCharges = useRef<Charge[]>([]);
  
  useEffect(() => {
    chargesRef.current = charges.map(c => {
      const existing = chargesRef.current.find(ec => ec.id === c.id);
      const lastState = lastStateCharges.current.find(lsc => lsc.id === c.id);
      
      // Detect if the position change came from a state update (e.g., loadExperiment)
      // rather than just being stale compared to the simulation ref.
      const statePositionChanged = !lastState || lastState.x !== c.x || lastState.y !== c.y;
      const isDraggingThis = draggingCharge === c.id;
      
      if (existing) {
        return { 
          ...c, 
          // If the state was explicitly updated (drag or experiment load), use it.
          // Otherwise, preserve the simulation ref's position.
          x: (isDraggingThis || statePositionChanged) ? c.x : existing.x,
          y: (isDraggingThis || statePositionChanged) ? c.y : existing.y,
          vx: (isDraggingThis || statePositionChanged) ? (c.vx || 0) : existing.vx,
          vy: (isDraggingThis || statePositionChanged) ? (c.vy || 0) : existing.vy 
        };
      }
      return { ...c, vx: c.vx || 0, vy: c.vy || 0 };
    });
    lastStateCharges.current = charges;
  }, [charges, draggingCharge]);
  
  const framesRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  
  const requestRef = useRef<number>(0);

  const addCharge = (q: number) => {
    const id = Math.random().toString(36).slice(2, 11);
    const newCharge: Charge = {
      id,
      x: (window.innerWidth / 2 - pan.x) / zoom + (Math.random() * 50 - 25),
      y: (window.innerHeight / 2 - pan.y) / zoom + (Math.random() * 50 - 25),
      q,
      vx: 0,
      vy: 0
    };
    setCharges(prev => [...prev, newCharge]);
  };

  const removeCharge = (id: string) => {
    setCharges(charges.filter(c => c.id !== id));
  };

  const updateChargeQ = (id: string, q: number) => {
    setCharges(charges.map(c => c.id === id ? { ...c, q } : c));
  };

  const loadExperiment = (type: string) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    zoomRef.current = 1;
    setHoverCharge(null);
    setDraggingCharge(null);

    if (type === 'dipole') {
      setCharges([
        { id: '1', x: cx - 150, y: cy, q: 1 },
        { id: '2', x: cx + 150, y: cy, q: -1 }
      ]);
    } else if (type === 'quadrupole') {
      setCharges([
        { id: '1', x: cx - 150, y: cy - 150, q: 1 },
        { id: '2', x: cx + 150, y: cy + 150, q: 1 },
        { id: '3', x: cx + 150, y: cy - 150, q: -1 },
        { id: '4', x: cx - 150, y: cy + 150, q: -1 }
      ]);
    } else if (type === 'capacitor') {
      const newCharges = [];
      for (let i = 0; i < 12; i++) {
        newCharges.push({ id: `p${i}`, x: cx - 150, y: cy - 220 + i * 40, q: 0.5 });
        newCharges.push({ id: `e${i}`, x: cx + 150, y: cy - 220 + i * 40, q: -0.5 });
      }
      setCharges(newCharges);
    } else if (type === 'ring') {
      const newCharges = [];
      const r = 200;
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        newCharges.push({ id: `r${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, q: 0.5 });
      }
      setCharges(newCharges);
    } else if (type === 'crystal') {
      const newCharges = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          newCharges.push({ 
            id: `c${r}${c}`, 
            x: cx - 150 + c * 100, 
            y: cy - 150 + r * 100, 
            q: (r + c) % 2 === 0 ? 1 : -1 
          });
        }
      }
      setCharges(newCharges);
    } else if (type === 'channel') {
      const newCharges = [];
      for (let i = 0; i < 12; i++) {
        newCharges.push({ id: `p1_${i}`, x: cx - 220 + i * 40, y: cy - 80, q: 1 });
        newCharges.push({ id: `p2_${i}`, x: cx - 220 + i * 40, y: cy + 80, q: 1 });
      }
      setCharges(newCharges);
    } else if (type === 'orbit') {
      setCharges([
        { id: 'sun', x: cx, y: cy, q: 10, vx: 0, vy: 0 },
        { id: 'planet1', x: cx, y: cy - 200, q: -0.1, vx: 8, vy: 0 },
        { id: 'planet2', x: cx, y: cy - 350, q: -0.2, vx: 6, vy: 0 },
      ]);
    } else if (type === 'repulsion') {
      setCharges([
        { id: 'r1', x: cx - 50, y: cy - 50, q: 1, vx: 0, vy: 0 },
        { id: 'r2', x: cx + 50, y: cy + 50, q: 1, vx: 0, vy: 0 },
        { id: 'r3', x: cx + 50, y: cy - 50, q: 1, vx: 0, vy: 0 },
        { id: 'r4', x: cx - 50, y: cy + 50, q: 1, vx: 0, vy: 0 },
      ]);
    } else if (type === 'scattering') {
      const newCharges = [];
      for (let i = 0; i < 6; i++) {
        newCharges.push({ id: `beam${i}`, x: cx - 400, y: cy - 100 + i * 40, q: 0.1, vx: 12, vy: 0 });
      }
      newCharges.push({ id: 'target', x: cx + 100, y: cy, q: 5, vx: 0, vy: 0 });
      setCharges(newCharges);
    }
  };

  // Canvas interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const rect = fgCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    const x = (screenX - currentPan.x) / currentZoom;
    const y = (screenY - currentPan.y) / currentZoom;

    if (e.button === 2) { // Right click
      e.currentTarget.releasePointerCapture(e.pointerId);
      const hit = chargesRef.current.find(c => Math.hypot(c.x - x, c.y - y) < 25);
      if (hit) removeCharge(hit.id);
      return;
    }

    const hit = chargesRef.current.find(c => Math.hypot(c.x - x, c.y - y) < 25);
    
    if (e.button === 0) {
      if (hit) {
        setDraggingCharge(hit.id);
      } else {
        setIsPanning(true);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = fgCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning) {
      const newPan = { x: panRef.current.x + e.movementX, y: panRef.current.y + e.movementY };
      panRef.current = newPan;
      setPan(newPan);
      return;
    }

    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    const x = (screenX - currentPan.x) / currentZoom;
    const y = (screenY - currentPan.y) / currentZoom;
    setMousePos({ x, y });

    if (draggingCharge) {
      setCharges(charges.map(c => c.id === draggingCharge ? { ...c, x, y, vx: 0, vy: 0 } : c));
    } else {
      const hit = chargesRef.current.find(c => Math.hypot(c.x - x, c.y - y) < 25);
      setHoverCharge(hit ? hit.id : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingCharge(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    const zoomFactor = Math.pow(0.999, e.deltaY);
    let newZoom = currentZoom * zoomFactor;
    newZoom = Math.max(0.1, Math.min(newZoom, 10));
    
    if (newZoom === currentZoom) return;

    const rect = fgCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      const logicalX = (screenX - currentPan.x) / currentZoom;
      const logicalY = (screenY - currentPan.y) / currentZoom;

      const newPan = {
        x: screenX - logicalX * newZoom,
        y: screenY - logicalY * newZoom
      };

      zoomRef.current = newZoom;
      panRef.current = newPan;
      
      setZoom(newZoom);
      setPan(newPan);
    }
  };

  useEffect(() => {
    needsFgRedraw.current = true;
  }, [charges, settings, draggingCharge, hoverCharge, pan, zoom, started]);

  useEffect(() => {
    // Only trigger background redraw when not dragging to maintain performance
    if (!draggingCharge) {
      needsBgRedraw.current = true;
    }
  }, [charges, settings, pan, zoom, started, draggingCharge]);

  useEffect(() => {
    const handleResize = () => { 
      needsBgRedraw.current = true; 
      needsFgRedraw.current = true; 
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rendering loop
  const draw = () => {
    requestRef.current = requestAnimationFrame(() => drawRef.current());

    const now = performance.now();
    framesRef.current++;
    frameCountRef.current++;
    
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(framesRef.current);
      framesRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    const currentCharges = chargesRef.current;

    // --- Physics Kinematics Integration ---
    if (settings.simulateMotion) {
      needsFgRedraw.current = true;
      // Decouple background rendering to ~15 FPS (every 4th frame) to save math overhead
      if (frameCountRef.current % 4 === 0) {
        needsBgRedraw.current = true;
      }
      
      const dt = 0.2 * settings.motionSpeed; // variable integration step
      const k = 2000;
      
      for (const c1 of currentCharges) {
        if (c1.id === draggingCharge) {
          c1.vx = 0; c1.vy = 0;
          continue;
        }
        let fx = 0, fy = 0;
        let currentDamping = 0.98; // base friction
        
        for (const c2 of currentCharges) {
          if (c1.id === c2.id) continue;
          let dx = c1.x - c2.x;
          let dy = c1.y - c2.y;
          let distSq = dx*dx + dy*dy;
          if (distSq < 1) distSq = 1; // prevent singularity
          let dist = Math.sqrt(distSq);
          
          // Physics softening to prevent singularities/explosions
          const softening = 400; // r_0^2
          const distSqSoft = distSq + softening;
          
          let f = (k * c1.q * c2.q) / distSqSoft;
          
          // Collision and sticking logic
          if (dist < 32) {
            let overlap = 32 - dist;
            f += overlap * Math.abs(f) * 0.5; 
            currentDamping = 0.5; 
          }
          
          fx += (dx/dist) * f;
          fy += (dy/dist) * f;
        }
        
        c1.vx = ((c1.vx || 0) + fx * dt) * currentDamping;
        c1.vy = ((c1.vy || 0) + fy * dt) * currentDamping;
        
        // Speed limit
        const speedSq = c1.vx * c1.vx + c1.vy * c1.vy;
        if (speedSq > 2500) {
           const speed = Math.sqrt(speedSq);
           c1.vx = (c1.vx / speed) * 50;
           c1.vy = (c1.vy / speed) * 50;
        }
      }
      for (const c1 of currentCharges) {
        if (c1.id !== draggingCharge) {
          c1.x += (c1.vx || 0) * dt;
          c1.y += (c1.vy || 0) * dt;
        }
      }
    }

    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;

    // Resize canvas to match display size
    if (bgCanvas.width !== window.innerWidth || bgCanvas.height !== window.innerHeight) {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      fgCanvas.width = window.innerWidth;
      fgCanvas.height = window.innerHeight;
      needsBgRedraw.current = true;
      needsFgRedraw.current = true;
    }

    const width = bgCanvas.width;
    const height = bgCanvas.height;
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;

    // Background Layer (Heavy Math)
    if (needsBgRedraw.current) {
      needsBgRedraw.current = false;
      const ctx = bgCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(currentPan.x, currentPan.y);
        ctx.scale(currentZoom, currentZoom);

        // Heatmap
        if (settings.showHeatmap) {
          ctx.globalCompositeOperation = 'screen';
          for (const charge of currentCharges) {
            const rad = 400;
            const grad = ctx.createRadialGradient(charge.x, charge.y, 0, charge.x, charge.y, rad);
            if (charge.q > 0) {
              grad.addColorStop(0, 'rgba(255, 0, 85, 0.4)');
              grad.addColorStop(1, 'rgba(255, 0, 85, 0)');
            } else {
              grad.addColorStop(0, 'rgba(0, 242, 255, 0.4)');
              grad.addColorStop(1, 'rgba(0, 242, 255, 0)');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(charge.x - rad, charge.y - rad, rad * 2, rad * 2);
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // Contours
        if (settings.showContours && currentCharges.length > 0) {
          const logicalCellSize = settings.contourGridSize / currentZoom;
          const startX = Math.floor((-currentPan.x / currentZoom) / logicalCellSize) * logicalCellSize;
          const startY = Math.floor((-currentPan.y / currentZoom) / logicalCellSize) * logicalCellSize;
          const logicalWidth = width / currentZoom;
          const logicalHeight = height / currentZoom;
          
          // Performance: Cap resolution to prevent O(N^2) explosion during zoom
          const maxDim = 150;
          const cols = Math.min(maxDim, Math.ceil(logicalWidth / logicalCellSize) + 2);
          const rows = Math.min(maxDim, Math.ceil(logicalHeight / logicalCellSize) + 2);
          
          // Adjust cellSize if capped to keep coverage
          const finalCellSizeX = logicalWidth / (cols - 2);
          const finalCellSizeY = logicalHeight / (rows - 2);

          const grid: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              grid[r][c] = getPotential({ x: startX + c * finalCellSizeX, y: startY + r * finalCellSizeY }, currentCharges);
            }
          }

          const contours = computeContours(grid, VOLTAGE_THRESHOLDS, finalCellSizeX, finalCellSizeY);
          
          ctx.lineWidth = 1 / currentZoom;
          for (const contour of contours) {
            ctx.beginPath();
            if (contour.value > 0) ctx.strokeStyle = `rgba(255, 0, 85, 0.4)`;
            else ctx.strokeStyle = `rgba(0, 242, 255, 0.4)`;
            
            for (const line of contour.lines) {
              ctx.moveTo(startX + line.p1.x, startY + line.p1.y);
              ctx.lineTo(startX + line.p2.x, startY + line.p2.y);
            }
            ctx.stroke();
          }
        }

        // Vector field
        if (settings.showVectors && currentCharges.length > 0) {
          const logicalStep = settings.vectorDensity / currentZoom;
          const startX = Math.floor((-currentPan.x / currentZoom) / logicalStep) * logicalStep;
          const startY = Math.floor((-currentPan.y / currentZoom) / logicalStep) * logicalStep;
          const logicalWidth = width / currentZoom;
          const logicalHeight = height / currentZoom;

          // Performance: Cap vector density to prevent freeze during zoom
          const maxVectors = 60;
          const finalStepX = Math.max(logicalWidth / maxVectors, logicalStep);
          const finalStepY = Math.max(logicalHeight / maxVectors, logicalStep);

          for (let y = startY + finalStepY / 2; y < startY + logicalHeight + finalStepY; y += finalStepY) {
            for (let x = startX + finalStepX / 2; x < startX + logicalWidth + finalStepX; x += finalStepX) {
              // Performance: Skip calculations very close to charges (singularities)
              let tooClose = false;
              for (const c of currentCharges) {
                if (Math.hypot(x - c.x, y - c.y) < 20) {
                  tooClose = true;
                  break;
                }
              }
              if (tooClose) continue;

              const e = getElectricField({ x, y }, currentCharges);
              const mag = Math.sqrt(e.x * e.x + e.y * e.y);
              if (mag > 0.01) {
                const length = Math.min(logicalStep * 0.9, Math.max(logicalStep * 0.3, (Math.log10(mag + 1) * 25) / currentZoom));
                const opacity = Math.min(1, Math.max(0.2, mag / 20));
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                const endX = x + (e.x / mag) * length;
                const endY = y + (e.y / mag) * length;
                ctx.lineTo(endX, endY);
                
                // Arrow head
                const headLen = 9 / currentZoom;
                const angle = Math.atan2(e.y, e.x);
                ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));

                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                ctx.lineWidth = 2.5 / currentZoom;
                ctx.stroke();
              }
            }
          }
        }

        // Silk threads (Field Lines)
        if (settings.showFieldLines && currentCharges.length > 0) {
          ctx.lineWidth = 1.5 / currentZoom;
          const logicalBounds = {
            minX: -currentPan.x / currentZoom - 100,
            minY: -currentPan.y / currentZoom - 100,
            maxX: (width - currentPan.x) / currentZoom + 100,
            maxY: (height - currentPan.y) / currentZoom + 100
          };

          const maxSteps = settings.simulateMotion ? 500 : 2000;
          for (const charge of currentCharges) {
            if (charge.q > 0 && Math.abs(charge.q) >= 0.5) {
              const numLines = Math.floor(Math.abs(charge.q) * 8);
              for (let i = 0; i < numLines; i++) {
                const angle = (i / numLines) * Math.PI * 2;
                const start = {
                  x: charge.x + Math.cos(angle) * 20,
                  y: charge.y + Math.sin(angle) * 20
                };
                const path = traceFieldLine(start, currentCharges, 5, maxSteps, 1, logicalBounds);
                if (path.length > 1) {
                  ctx.beginPath();
                  ctx.moveTo(path[0].x, path[0].y);
                  for (let j = 1; j < path.length; j++) {
                    ctx.lineTo(path[j].x, path[j].y);
                  }
                  const grad = ctx.createLinearGradient(
                    path[0].x, path[0].y, 
                    path[path.length-1].x, path[path.length-1].y
                  );
                  grad.addColorStop(0, 'rgba(255, 0, 85, 0.6)');
                  grad.addColorStop(1, 'rgba(0, 242, 255, 0.6)');
                  ctx.strokeStyle = grad;
                  ctx.stroke();
                }
              }
            }
          }
        }

        ctx.restore();
      }
    }

    // Foreground Layer (Fast Moving Charges)
    if (needsFgRedraw.current) {
      needsFgRedraw.current = false;
      const ctx = fgCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(currentPan.x, currentPan.y);
        ctx.scale(currentZoom, currentZoom);

        for (const charge of currentCharges) {
          const isPositive = charge.q > 0;
          const color = isPositive ? '#FF0055' : '#00F2FF';
          
          ctx.shadowBlur = 20 / currentZoom;
          ctx.shadowColor = color;
          
          ctx.beginPath();
          ctx.arc(charge.x, charge.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = isPositive ? '#550011' : '#002233';
          ctx.fill();
          ctx.lineWidth = 2 / currentZoom;
          ctx.strokeStyle = color;
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          
          ctx.fillStyle = '#FFF';
          ctx.font = `${20 / currentZoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isPositive ? '+' : '-', charge.x, charge.y + (1 / currentZoom));
          
          if (hoverCharge === charge.id || draggingCharge === charge.id) {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([4 / currentZoom, 4 / currentZoom]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Force Vector Visualization
          if (settings.showForceVectors) {
            const others = currentCharges.filter(c => c.id !== charge.id);
            if (others.length > 0) {
              const eField = getElectricField({ x: charge.x, y: charge.y }, others);
              const fx = charge.q * eField.x;
              const fy = charge.q * eField.y;
              const fMag = Math.sqrt(fx * fx + fy * fy);

              if (fMag > 0.1) {
                // Scale force vector for display
                const displayLen = Math.min(150, Math.log10(fMag + 1) * 40) / currentZoom;
                const endX = charge.x + (fx / fMag) * displayLen;
                const endY = charge.y + (fy / fMag) * displayLen;

                ctx.beginPath();
                ctx.moveTo(charge.x, charge.y);
                ctx.lineTo(endX, endY);
                
                // Arrow head
                const headLen = 10 / currentZoom;
                const angle = Math.atan2(fy, fx);
                ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));

                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 3 / currentZoom;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // Optional: add text for force magnitude
                // ctx.fillStyle = 'white';
                // ctx.font = `10px monospace`;
                // ctx.fillText(`${fMag.toFixed(0)}N`, endX + 5, endY);
              }
            }
          }
        }
        ctx.restore();
      }
    }
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    requestRef.current = requestAnimationFrame(() => drawRef.current());
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Starts the loop once, calls the latest draw closure every frame.

  const mouseE = getElectricField(mousePos, chargesRef.current);
  const mouseV = getPotential(mousePos, chargesRef.current);
  const mouseMag = Math.sqrt(mouseE.x * mouseE.x + mouseE.y * mouseE.y);

  return (
    <div className="relative w-screen h-screen" onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />
      <canvas
        ref={fgCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className={`absolute inset-0 z-10 ${isPanning ? 'cursor-grabbing' : draggingCharge ? 'cursor-grabbing' : hoverCharge ? 'cursor-grab' : 'cursor-crosshair'}`}
      />
      
      {/* Probe Tool Overlay */}
      <div 
        className="pointer-events-none absolute z-10 bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-lg text-xs font-mono transition-opacity duration-200 shadow-2xl"
        style={{ 
          left: Math.min(window.innerWidth - 180, Math.max(10, mousePos.x * zoom + pan.x + 20)), 
          top: Math.min(window.innerHeight - 100, Math.max(10, mousePos.y * zoom + pan.y + 20)), 
          opacity: draggingCharge || isPanning ? 0 : 1 
        }}
      >
        <div className="text-gray-400 mb-1 flex items-center gap-1"><Info size={12}/> PROBE DATA</div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">Potential (V):</span>
          <span className={mouseV > 0 ? 'text-neon-red' : 'text-electric-blue'}>
            {mouseV.toFixed(2)} V
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">|E| Field:</span>
          <span className="text-white">{mouseMag.toFixed(2)} N/C</span>
        </div>
      </div>

      {/* FPS Meter */}
      {started && (
        <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono text-electric-blue shadow-[0_0_15px_rgba(0,242,255,0.2)]">
          {fps} FPS
        </div>
      )}

      {/* Landing Page Overlay */}
      {!started && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xl flex flex-col items-center overflow-y-auto pointer-events-none">
          <div className="w-full max-w-5xl px-6 py-20 pointer-events-auto flex flex-col items-center mt-12 md:mt-24">
            
            {/* Title */}
            <h1 className="text-6xl md:text-8xl font-black text-white text-center tracking-tighter mb-6 leading-tight drop-shadow-2xl transition-transform hover:scale-105 duration-500">
              Understand the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-red via-purple-500 to-electric-blue">Invisible Forces</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-400 text-center max-w-3xl mb-12 font-light leading-relaxed">
              LuminaField is an interactive, browser-based physics sandbox. 
              Visualize electric fields, map equipotential lines, and explore Maxwell's equations in a cinematic environment.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-24">
              <button 
                onClick={() => setStarted(true)}
                className="px-8 py-4 bg-white text-black font-bold rounded-full text-lg hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-2 group"
              >
                Launch Sandbox <Zap size={20} className="group-hover:text-neon-red transition-colors" />
              </button>
              <p className="text-sm text-gray-500 font-mono flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                <Info size={14}/> Try dragging the charges in the background!
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-20 text-left">
              <FeatureCard 
                title="Coulomb's Law" 
                desc="Experience the fundamental principle of electrostatics. Watch as opposite charges attract and like charges repel across the vacuum."
                icon={<Zap className="text-neon-red group-hover:animate-pulse" />}
              />
              <FeatureCard 
                title="Vector Fields" 
                desc="Visualize the invisible vectors of force. Field lines and arrows demonstrate the precise direction and magnitude of acceleration."
                icon={<Eye className="text-purple-500 group-hover:scale-110 transition-transform" />}
              />
              <FeatureCard 
                title="Electric Potential" 
                desc="Explore equipotential topography. Discover how scalar voltage fields create 'hills' of high energy and 'valleys' of low energy."
                icon={<Settings className="text-electric-blue group-hover:rotate-180 transition-transform duration-700" />}
              />
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      {started && (
        <div className="absolute left-6 top-6 z-20 w-80 bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-48px)]">
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <Zap className="text-neon-red" size={24} /> 
            LuminaField
          </h1>
          <p className="text-xs text-gray-400 font-mono tracking-wider">ELECTROSTATIC SANDBOX</p>
        </div>
        
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {/* Layer Toggles */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye size={16} /> Visual Layers
            </h2>
            <div className="flex flex-col gap-2">
              <Toggle 
                label="Simulate Kinematics (Motion)" 
                active={settings.simulateMotion} 
                onChange={(v) => setSettings({...settings, simulateMotion: v})} 
              />
              {settings.simulateMotion && (
                <div className="flex items-center gap-3 px-1 mb-1 mt-[-4px]">
                  <span className="text-xs text-gray-500 font-mono w-12">Speed</span>
                  <input 
                    type="range" 
                    min="0.1" max="3" step="0.1" 
                    value={settings.motionSpeed} 
                    onChange={(e) => setSettings({...settings, motionSpeed: parseFloat(e.target.value)})}
                    className="flex-1 accent-neon-red h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-red [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-xs text-neon-red font-mono w-8 text-right">{settings.motionSpeed}x</span>
                </div>
              )}
              <Toggle 
                label="Vector Field" 
                active={settings.showVectors} 
                onChange={(v) => setSettings({...settings, showVectors: v})} 
              />
              <Toggle 
                label="Silk Threads (Field Lines)" 
                active={settings.showFieldLines} 
                onChange={(v) => setSettings({...settings, showFieldLines: v})} 
              />
              <Toggle 
                label="Show Applied Forces" 
                active={settings.showForceVectors} 
                onChange={(v) => setSettings({...settings, showForceVectors: v})} 
              />
              <Toggle 
                label="Equipotential Contours" 
                active={settings.showContours} 
                onChange={(v) => setSettings({...settings, showContours: v})} 
              />
              <Toggle 
                label="Potential Heatmap" 
                active={settings.showHeatmap} 
                onChange={(v) => setSettings({...settings, showHeatmap: v})} 
              />
            </div>
          </div>

          <div className="h-px bg-white/10 w-full" />

          {/* Add Charges */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus size={16} /> Add Charge
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => addCharge(1)}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-neon-red/10 border border-neon-red/30 hover:bg-neon-red/20 text-neon-red rounded-lg transition-all"
              >
                <Plus size={16} /> Proton
              </button>
              <button 
                onClick={() => addCharge(-1)}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-electric-blue/10 border border-electric-blue/30 hover:bg-electric-blue/20 text-electric-blue rounded-lg transition-all"
              >
                <Minus size={16} /> Electron
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10 w-full" />

          {/* Experiments */}
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-3 group" 
              onClick={() => setShowExperiments(!showExperiments)}
            >
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-white transition-colors">
                <BookOpen size={16} /> Experiments
              </h2>
              <ChevronDown className={`text-gray-400 group-hover:text-white transition-transform duration-300 ${showExperiments ? 'rotate-180' : ''}`} size={16} />
            </div>
            
            <div className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ${showExperiments ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <button onClick={() => loadExperiment('dipole')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Electric Dipole
              </button>
              <button onClick={() => loadExperiment('quadrupole')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Quadrupole Array
              </button>
              <button onClick={() => loadExperiment('capacitor')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Parallel Plate Capacitor
              </button>
              <button onClick={() => loadExperiment('ring')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Faraday Ring (Shielding)
              </button>
              <button onClick={() => loadExperiment('crystal')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Salt Crystal (4x4 Matrix)
              </button>
              <button onClick={() => loadExperiment('channel')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Waveguide Channel
              </button>
              <button onClick={() => loadExperiment('orbit')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Orbital Mechanics
              </button>
              <button onClick={() => loadExperiment('repulsion')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Explosive Repulsion
              </button>
              <button onClick={() => loadExperiment('scattering')} className="text-left px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors border border-white/5">
                Particle Scattering (Beam)
              </button>
            </div>
          </div>

          <div className="h-px bg-white/10 w-full" />

          {/* Active Charges */}
          <div>
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings size={16} /> Active Charges
            </h2>
            <div className="flex flex-col gap-3">
              {charges.length === 0 && (
                <div className="text-sm text-gray-500 italic">No charges. Add some!</div>
              )}
              {charges.map(c => (
                <div key={c.id} className="bg-black/30 border border-white/5 p-3 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-gray-400">ID: {c.id}</span>
                    <button onClick={() => removeCharge(c.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${c.q > 0 ? 'text-neon-red' : 'text-electric-blue'}`}>
                      {c.q > 0 ? '+' : ''}{c.q} nC
                    </span>
                    <input 
                      type="range" 
                      min="-5" max="5" step="0.5" 
                      value={c.q} 
                      onChange={(e) => updateChargeQ(c.id, parseFloat(e.target.value))}
                      className="flex-1 accent-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-black/40 border-t border-white/10 text-xs text-gray-500 font-mono text-center">
          Left-click & drag to move charges or pan. <br/> Scroll to zoom. <br/> Right-click to delete.
        </div>
      </div>
      )}
    </div>
  );
}

function Toggle({ label, active, onChange }: { label: string, active: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${active ? 'bg-white/40' : 'bg-black/50'}`}>
        <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <input type="checkbox" className="hidden" checked={active} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function FeatureCard({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="group bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 backdrop-blur-md hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="p-3 bg-black/40 rounded-xl w-fit mb-4 border border-white/5 transition-colors group-hover:border-white/20">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2 transition-colors group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
