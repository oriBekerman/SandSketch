import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { PlacedDecoration, SimParameters, TOOL_DETAILS, ToolType, SAND_PRESETS } from '../types';
import { RotateCw, Maximize2, Move, Undo2 } from 'lucide-react';

interface SandboxProps {
  parameters: SimParameters;
  activeTool: ToolType;
  decorations: PlacedDecoration[];
  setDecorations: React.Dispatch<React.SetStateAction<PlacedDecoration[]>>;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  cameraPitch: number;
  cameraYaw: number;
  cameraZoom: number;
  cameraPanX: number;
  cameraPanY: number;
  setCameraPitch: (val: number) => void;
  setCameraYaw: (val: number) => void;
  setCameraZoom: (val: number) => void;
  setCameraPanX: (val: number) => void;
  setCameraPanY: (val: number) => void;
  onStrokeComplete: () => void;
  undoStackRef: React.MutableRefObject<Float32Array[]>;
  redoStackRef: React.MutableRefObject<Float32Array[]>;
  activeDecorationType: 'stone' | 'shell' | 'leaf' | null;
  setActiveDecorationType: (type: 'stone' | 'shell' | 'leaf' | null) => void;
  isOrbitMode: boolean;
  setIsOrbitMode: (val: boolean) => void;
  theme: 'zen_garden' | 'beach_side' | 'minimal_studio';
}

export interface SandboxRef {
  clearSandbox: () => void;
  resetHeights: (amount: number) => void;
  generateTerrain: (type: 'dunes' | 'ripples' | 'sin_ripples' | 'waves' | 'mountains' | 'crater' | 'valley' | 'flat', baseHeight?: number) => void;
  undo: () => void;
  redo: () => void;
  exportImage: () => void;
  saveToStorage: (name: string) => void;
  loadFromStorage: (data: string) => void;
}

// Heightmap dimensions
const NX = 160;
const NY = 160;

export const Sandbox = forwardRef<SandboxRef, SandboxProps>(({
  parameters,
  activeTool,
  decorations,
  setDecorations,
  isPaused,
  setIsPaused,
  cameraPitch,
  cameraYaw,
  cameraZoom,
  cameraPanX,
  cameraPanY,
  setCameraPitch,
  setCameraYaw,
  setCameraZoom,
  setCameraPanX,
  setCameraPanY,
  onStrokeComplete,
  undoStackRef,
  redoStackRef,
  activeDecorationType,
  setActiveDecorationType,
  isOrbitMode,
  setIsOrbitMode,
  theme,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Height buffers
  const heightRef = useRef<Float32Array>(new Float32Array(NX * NY));
  const prevHeightRef = useRef<Float32Array>(new Float32Array(NX * NY));
  const activeSettleRef = useRef<boolean>(true); // keeps sim awake if true
  const sleepTimerRef = useRef<number>(0);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const isOrbitDraggingRef = useRef<boolean>(false);
  const lastScreenMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Load Sand Color Preset
  const currentPreset = SAND_PRESETS.find(p => p.id === parameters.sandColorId) || SAND_PRESETS[0];

  // Initialize sand with some base roughness and height
  const initializeHeights = (amount: number = 0.5) => {
    const H = heightRef.current;
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        const idx = y * NX + x;
        // Natural soft dunes on initial load
        const duneNoise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.06;
        const microNoise = (Math.random() - 0.5) * 0.015 * parameters.surfaceRoughness;
        H[idx] = amount + duneNoise + microNoise;
        if (H[idx] < 0.02) H[idx] = 0.02;
        if (H[idx] > 1.0) H[idx] = 1.0;
      }
    }
    // Deep copy for initial undo state
    saveStateToUndo();
    triggerSimulationWake();
  };

  // Generate a beautiful pre-seeded organic 3D terrain
  const generateTerrain = (type: 'dunes' | 'ripples' | 'sin_ripples' | 'waves' | 'mountains' | 'crater' | 'valley' | 'flat', baseHeight: number = 0.45) => {
    saveStateToUndo();
    const H = heightRef.current;
    
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        const idx = y * NX + x;
        const microNoise = (Math.random() - 0.5) * 0.012 * parameters.surfaceRoughness;
        
        let val = baseHeight;
        
        if (type === 'dunes') {
          // Broad sweeping rolling desert sand dunes
          const d1 = Math.sin(x * 0.035 + y * 0.02) * 0.18;
          const d2 = Math.cos(x * 0.015 - y * 0.04) * 0.08;
          const d3 = Math.sin((x + y) * 0.12) * 0.018; // ripples on top
          val = baseHeight + d1 + d2 + d3;
        } else if (type === 'ripples') {
          // Concentric combed ripple waves radiating outwards
          const cx1 = NX * 0.5;
          const cy1 = NY * 0.5;
          const dist1 = Math.sqrt((x - cx1) * (x - cx1) + (y - cy1) * (y - cy1));
          const ripple1 = Math.sin(dist1 * 0.32) * 0.11;
          const falloff1 = Math.max(0, 1 - dist1 / (NX * 0.65));
          
          const cx2 = NX * 0.25;
          const cy2 = NY * 0.3;
          const dist2 = Math.sqrt((x - cx2) * (x - cx2) + (y - cy2) * (y - cy2));
          const ripple2 = Math.sin(dist2 * 0.45) * 0.04;
          const falloff2 = Math.max(0, 1 - dist2 / (NX * 0.35));
          
          val = baseHeight + (ripple1 * falloff1) + (ripple2 * falloff2);
        } else if (type === 'sin_ripples') {
          // Highly defined, clean parallel sinusoidal raked wave ripples across the diagonal plane
          const angle = Math.PI / 6; 
          const xu = x * Math.cos(angle) + y * Math.sin(angle);
          const mainWave = Math.sin(xu * 0.45) * 0.13;
          const harmonic = Math.sin(xu * 0.225) * 0.03;
          const heightMod = Math.sin(y * 0.03) * Math.cos(x * 0.03) * 0.06;
          val = baseHeight + mainWave + harmonic + heightMod;
        } else if (type === 'waves') {
          // Overlapping wave-like ripples with complex water ripple interference
          const cx1 = NX * 0.4;
          const cy1 = NY * 0.4;
          const dist1 = Math.sqrt((x - cx1) * (x - cx1) + (y - cy1) * (y - cy1));
          const wave1 = Math.sin(dist1 * 0.28 - 2.0) * 0.07;
          const falloff1 = Math.max(0, 1 - dist1 / (NX * 0.8));

          const cx2 = NX * 0.7;
          const cy2 = NY * 0.25;
          const dist2 = Math.sqrt((x - cx2) * (x - cx2) + (y - cy2) * (y - cy2));
          const wave2 = Math.sin(dist2 * 0.38 - 1.0) * 0.05;
          const falloff2 = Math.max(0, 1 - dist2 / (NX * 0.6));

          const cx3 = NX * 0.25;
          const cy3 = NY * 0.75;
          const dist3 = Math.sqrt((x - cx3) * (x - cx3) + (y - cy3) * (y - cy3));
          const wave3 = Math.sin(dist3 * 0.22 + 3.0) * 0.06;
          const falloff3 = Math.max(0, 1 - dist3 / (NX * 0.7));

          val = baseHeight + (wave1 * falloff1) + (wave2 * falloff2) + (wave3 * falloff3);
        } else if (type === 'mountains') {
          // Majestic peaks and canyon beds
          const cx = NX * 0.5;
          const cy = NY * 0.5;
          const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          
          const m1 = Math.sin(x * 0.04) * Math.cos(y * 0.04) * 0.16;
          const m2 = Math.sin(x * 0.085 + y * 0.05) * 0.07;
          const centerPeak = Math.exp(-(dist * dist) / (2 * 32 * 32)) * 0.35;
          val = (baseHeight - 0.12) + m1 + m2 + centerPeak;
        } else if (type === 'crater') {
          // Immersive volcanic sand bowl
          const cx = NX * 0.5;
          const cy = NY * 0.5;
          const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          
          const rCrater = NX * 0.28;
          const distFromRim = Math.abs(dist - rCrater);
          const rimHeight = Math.max(0, 1 - distFromRim / 15) * 0.3;
          const bowlDepth = dist < rCrater ? (1 - dist / rCrater) * -0.24 : 0;
          
          val = baseHeight + rimHeight + bowlDepth;
        } else if (type === 'valley') {
          // Broad dividing river valley / canyon channel
          const distToDiag = Math.abs(x - y) / Math.sqrt(2);
          const valleyFactor = Math.min(1, distToDiag / (NX * 0.35));
          const ridge = Math.pow(valleyFactor, 1.4) * 0.4;
          const ridgeNoise = Math.sin(y * 0.07) * Math.cos(x * 0.07) * 0.06 * valleyFactor;
          
          val = (baseHeight - 0.12) + ridge + ridgeNoise;
        } else {
          // flat plane
          val = baseHeight;
        }
        
        H[idx] = val + microNoise;
        if (H[idx] < 0.02) H[idx] = 0.02;
        if (H[idx] > 1.2) H[idx] = 1.2;
      }
    }
    
    triggerSimulationWake();
  };

  // Keep a history state helper
  const saveStateToUndo = () => {
    const currentCopy = new Float32Array(heightRef.current);
    undoStackRef.current.push(currentCopy);
    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift(); // limit history size
    }
    // Clear redo
    redoStackRef.current = [];
  };

  // Wake simulation
  const triggerSimulationWake = () => {
    activeSettleRef.current = true;
    sleepTimerRef.current = 120; // run for at least 120 frames
  };

  // Expose controls to parent
  useImperativeHandle(ref, () => ({
    clearSandbox: () => {
      saveStateToUndo();
      initializeHeights(0.5);
      setDecorations([]);
      triggerSimulationWake();
    },
    resetHeights: (amount: number) => {
      saveStateToUndo();
      initializeHeights(amount);
      triggerSimulationWake();
    },
    generateTerrain: (type: 'dunes' | 'ripples' | 'sin_ripples' | 'waves' | 'mountains' | 'crater' | 'valley' | 'flat', baseHeight: number = 0.45) => {
      generateTerrain(type, baseHeight);
    },
    undo: () => {
      if (undoStackRef.current.length > 1) {
        const current = undoStackRef.current.pop()!;
        redoStackRef.current.push(current);
        // Peak the previous state
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        heightRef.current.set(prev);
        triggerSimulationWake();
        onStrokeComplete();
      }
    },
    redo: () => {
      if (redoStackRef.current.length > 0) {
        const next = redoStackRef.current.pop()!;
        undoStackRef.current.push(next);
        heightRef.current.set(next);
        triggerSimulationWake();
        onStrokeComplete();
      }
    },
    exportImage: () => {
      if (!canvasRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `zen_sand_art_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    },
    saveToStorage: (name: string) => {
      const H = Array.from(heightRef.current);
      const saveData = {
        name,
        heights: H,
        decorations,
        presetId: parameters.sandColorId,
        timestamp: Date.now()
      };
      const saves = JSON.parse(localStorage.getItem('zen_sand_saves') || '[]');
      saves.push(saveData);
      localStorage.setItem('zen_sand_saves', JSON.stringify(saves));
    },
    loadFromStorage: (dataStr: string) => {
      try {
        const data = JSON.parse(dataStr);
        if (data.heights && data.heights.length === NX * NY) {
          saveStateToUndo();
          heightRef.current.set(new Float32Array(data.heights));
          if (data.decorations) {
            setDecorations(data.decorations);
          }
          triggerSimulationWake();
        }
      } catch (e) {
        console.error("Failed to load sandbox state", e);
      }
    }
  }));

  // Trigger setup on mount
  useEffect(() => {
    generateTerrain('dunes', 0.45);
  }, []);

  // Update heights if preset changes or wetness changes
  useEffect(() => {
    triggerSimulationWake();
  }, [parameters.sandColorId, parameters.surfaceRoughness, parameters.wetness]);

  // -------------------------------------------------------------
  // SIMULATION PHYSICS (Cellular Automata Avalanches)
  // -------------------------------------------------------------
  const performPhysicsStep = () => {
    if (isPaused) return false;

    const H = heightRef.current;
    const maxSlope = parameters.sandSoftness * (1.0 + parameters.wetness * 2.5); // wet sand is much stickier, holds shapes better
    const flowRate = 0.12 * (1.0 - parameters.wetness * 0.7); // wet sand slides much slower

    let movedAny = false;
    const dH = new Float32Array(NX * NY);

    // Coordinate sweeps: alternate sweeps to reduce directional bias and produce perfectly symmetrical piles
    const alternate = Math.random() > 0.5;
    const startY = alternate ? 1 : NY - 2;
    const endY = alternate ? NY - 1 : 0;
    const stepY = alternate ? 1 : -1;

    for (let y = startY; y !== endY; y += stepY) {
      for (let x = 1; x < NX - 1; x++) {
        const idx = y * NX + x;
        const h = H[idx];
        if (h <= 0.01) continue;

        // Check 8 neighbors (ortho + diag)
        const neighbors = [
          { index: idx + 1, dist: 1.0 },      // right
          { index: idx - 1, dist: 1.0 },      // left
          { index: idx + NX, dist: 1.0 },     // down
          { index: idx - NX, dist: 1.0 },     // up
          { index: idx + NX + 1, dist: 1.41 }, // diag down-right
          { index: idx + NX - 1, dist: 1.41 }, // diag down-left
          { index: idx - NX + 1, dist: 1.41 }, // diag up-right
          { index: idx - NX - 1, dist: 1.41 }  // diag up-left
        ];

        for (const n of neighbors) {
          const hn = H[n.index];
          const diff = h - hn;
          const slope = diff / n.dist;

          if (slope > maxSlope) {
            // Mass transfer sliding down slope
            const slide = (slope - maxSlope) * flowRate * n.dist * 0.15;
            if (slide > 0.0001) {
              dH[idx] -= slide;
              dH[n.index] += slide;
              movedAny = true;
            }
          }
        }
      }
    }

    // Apply accumulated modifications
    if (movedAny) {
      for (let i = 0; i < NX * NY; i++) {
        H[i] += dH[i];
        if (H[i] < 0.0) H[i] = 0.0;
        if (H[i] > 1.3) H[i] = 1.3; // soft limit
      }
    }

    return movedAny;
  };

  // -------------------------------------------------------------
  // RENDERING & LIGHTING (BUMP MAPPING + DEPTH SHADOWS)
  // -------------------------------------------------------------
  const renderSand = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const H = heightRef.current;
    
    // Create ImageData buffer
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Normalizing light source direction
    const lx = parameters.lightX;
    const ly = parameters.lightY;
    const lz = parameters.lightZ;
    const lenL = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const nlx = lx / lenL;
    const nly = ly / lenL;
    const nlz = lz / lenL;

    // Light halfway vector for specular highlight (assuming view vector is straight up [0,0,1])
    const hx = nlx;
    const hy = nly;
    const hz = nlz + 1.0;
    const lenH = Math.sqrt(hx * hx + hy * hy + hz * hz);
    const nhx = hx / lenH;
    const nhy = hy / lenH;
    const nhz = hz / lenH;

    // Resolve sand base colors from current preset
    const hexColor = currentPreset.color;
    const rBase = parseInt(hexColor.slice(1, 3), 16);
    const gBase = parseInt(hexColor.slice(3, 5), 16);
    const bBase = parseInt(hexColor.slice(5, 7), 16);

    // Wet sand shifts colors darker and slightly more saturated
    const rSand = rBase * (1.0 - parameters.wetness * 0.28);
    const gSand = gBase * (1.0 - parameters.wetness * 0.32);
    const bSand = bBase * (1.0 - parameters.wetness * 0.35);

    // Calculate scaling ratios
    const cellW = width / NX;
    const cellH = height / NY;

    // Render loop
    for (let py = 0; py < height; py++) {
      // Map screen pixel coordinate to sand grid cell
      const gy = Math.floor(py / cellH);
      const gyClamped = Math.max(1, Math.min(NY - 2, gy));

      for (let px = 0; px < width; px++) {
        const gx = Math.floor(px / cellW);
        const gxClamped = Math.max(1, Math.min(NX - 2, gx));

        const idx = gyClamped * NX + gxClamped;
        const hVal = H[idx];

        // 1. Calculate Local Normal vector (Bump Mapping)
        // Check surrounding cells to get gradients
        const hL = H[idx - 1];
        const hR = H[idx + 1];
        const hU = H[idx - NX];
        const hD = H[idx + NX];

        // Normal gradient coefficients - adjusting with roughness
        const nzScale = 0.09 * (1.0 - currentPreset.roughness * 0.4); 
        const nx = (hL - hR) * 0.5;
        const ny = (hU - hD) * 0.5;
        const nz = nzScale;

        const lenN = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const nnx = nx / lenN;
        const nny = ny / lenN;
        const nnz = nz / lenN;

        // 2. Compute Shading: Ambient + Diffuse (Lambertian)
        const diffuse = Math.max(0.0, nnx * nlx + nny * nly + nnz * nlz);

        // 3. Granular Noise Details (sparkling grains)
        // High frequency static deterministic grain noise based on coordinates
        const grainNoise = ((Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1);
        const isSparkle = grainNoise > 0.985 && diffuse > 0.5;

        // 4. Horizon Self-Shadowing approximation
        // Look back along the light direction to detect occlusion shadows
        let shadow = 1.0;
        const lookBackDist = 8;
        const shadowLookX = Math.round(-nlx * lookBackDist);
        const shadowLookY = Math.round(-nly * lookBackDist);
        
        const testX = Math.max(0, Math.min(NX - 1, gxClamped + shadowLookX));
        const testY = Math.max(0, Math.min(NY - 1, gyClamped + shadowLookY));
        const testH = H[testY * NX + testX];

        if (testH > hVal + 0.015) {
          // Shadow occlusion ratio
          const depthDiff = testH - hVal;
          shadow = Math.max(0.12, 1.0 - (depthDiff * 4.5 * parameters.shadowSoftness));
        }

        // 5. Specular Highlights (Quartz/Grains shine)
        const dotSpec = Math.max(0.0, nnx * nhx + nny * nhy + nnz * nhz);
        const spec = Math.pow(dotSpec, 24) * currentPreset.roughness * 0.3;

        // 6. Base Color & Reveal Bedrock underneath
        let rFinal = rSand;
        let gFinal = gSand;
        let bFinal = bSand;

        if (hVal < 0.16) {
          // Scraped sand reveals the base of the wooden box / polished slate bottom
          const factor = Math.max(0, hVal / 0.16);
          
          let rBedrock = 65;
          let gBedrock = 38;
          let bBedrock = 22;

          if (theme === 'zen_garden') {
            // Elegant dark grey slate stone with subtle parallel split lines
            const slateNoise = (Math.sin(px * 0.02 + py * 0.01) * Math.cos(px * 0.01 - py * 0.02) + 1.0) * 6;
            const slateLayers = Math.sin((px + py) * 0.05) * 8;
            rBedrock = 45 + slateLayers + slateNoise;
            gBedrock = 48 + slateLayers + slateNoise;
            bBedrock = 52 + slateLayers + slateNoise;
          } else if (theme === 'beach_side') {
            // Light, warm-toned coastal driftwood / cedar wood grain
            const cx = px - width / 2;
            const cy = py - height / 2;
            const distFromCtr = Math.sqrt(cx * cx + cy * cy);
            const woodRings = Math.sin(distFromCtr * 0.06) * 12 + 8;
            const woodNoise = (Math.sin(px * 0.01) * Math.cos(py * 0.01) + 1.0) * 5;
            rBedrock = 175 + woodRings + woodNoise;
            gBedrock = 145 + woodRings * 0.8 + woodNoise;
            bBedrock = 115 + woodRings * 0.6 + woodNoise;
          } else {
            // 'minimal_studio' -> Modern dark obsidian / polished slate
            const cx = px - width / 2;
            const cy = py - height / 2;
            const distFromCtr = Math.sqrt(cx * cx + cy * cy);
            const ringPattern = Math.sin(distFromCtr * 0.05) * 6;
            const noise = (Math.sin(px * 0.03) * Math.cos(py * 0.03) + 1.0) * 4;
            rBedrock = 30 + ringPattern + noise;
            gBedrock = 30 + ringPattern + noise;
            bBedrock = 32 + ringPattern + noise;
          }

          rFinal = rSand * factor + rBedrock * (1.0 - factor);
          gFinal = gSand * factor + gBedrock * (1.0 - factor);
          bFinal = bSand * factor + bBedrock * (1.0 - factor);
        }

        // Apply Shading
        const lighting = parameters.ambientIntensity + (diffuse * parameters.lightIntensity * shadow);
        rFinal *= lighting;
        gFinal *= lighting;
        bFinal *= lighting;

        // Add Specular shine
        if (isSparkle) {
          rFinal += 45 * parameters.lightIntensity;
          gFinal += 45 * parameters.lightIntensity;
          bFinal += 45 * parameters.lightIntensity;
        } else {
          rFinal += spec * 150 * parameters.lightIntensity;
          gFinal += spec * 150 * parameters.lightIntensity;
          bFinal += spec * 150 * parameters.lightIntensity;
        }

        // Add subtle high-frequency sand grain paper-like texture overlay
        const noiseFactor = (grainNoise * 14 - 7) * parameters.surfaceRoughness;
        rFinal += noiseFactor;
        gFinal += noiseFactor;
        bFinal += noiseFactor;

        // Clamping RGB
        const pixelIdx = (py * width + px) * 4;
        data[pixelIdx]     = Math.max(0, Math.min(255, rFinal));     // Red
        data[pixelIdx + 1] = Math.max(0, Math.min(255, gFinal)); // Green
        data[pixelIdx + 2] = Math.max(0, Math.min(255, bFinal)); // Blue
        data[pixelIdx + 3] = 255;                                     // Alpha
      }
    }

    // Put image buffer
    ctx.putImageData(imgData, 0, 0);
  };

  // Draw placed decorations onto the sandbox canvas
  const drawDecorations = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    decorations.forEach((dec) => {
      const px = dec.x * width;
      const py = dec.y * height;
      const decScale = dec.scale * (width / 512) * 22; // Scaled base size

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(dec.rotation);

      // Light shadow offset vector depending on parameters
      const shadowOffsetX = -parameters.lightX * 6;
      const shadowOffsetY = -parameters.lightY * 6;

      // Draw shadow first
      ctx.beginPath();
      if (dec.type === 'stone') {
        ctx.ellipse(shadowOffsetX, shadowOffsetY, decScale * 1.1, decScale * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.filter = 'blur(4px)';
        ctx.fill();
      } else if (dec.type === 'shell') {
        ctx.ellipse(shadowOffsetX, shadowOffsetY, decScale * 1.0, decScale * 0.9, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.filter = 'blur(3px)';
        ctx.fill();
      } else if (dec.type === 'leaf') {
        // Draw approximate maple leaf silhouette for shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.filter = 'blur(2px)';
        ctx.beginPath();
        ctx.arc(shadowOffsetX, shadowOffsetY, decScale * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';

      // Draw Main Object Body
      if (dec.type === 'stone') {
        // Smooth Zen river stones
        const stoneGradients = [
          ['#3a3a3d', '#1f1f21'], // dark basalt slate
          ['#8e8e93', '#5a5a5e'], // grey river granite
          ['#dedede', '#a5a5a8'], // quartz white stone
        ];
        const colors = stoneGradients[dec.variant % stoneGradients.length];
        
        const grad = ctx.createRadialGradient(
          -decScale * 0.3, -decScale * 0.3, decScale * 0.1,
          0, 0, decScale
        );
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(1, colors[1]);

        ctx.beginPath();
        // River stones are organic oblong shapes
        const rRatio = dec.variant === 1 ? 0.75 : 0.65;
        ctx.ellipse(0, 0, decScale, decScale * rRatio, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Overlay a polished subtle highlight crescent
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-decScale * 0.2, -decScale * 0.1, decScale * 0.5, Math.PI * 1.0, Math.PI * 1.7);
        ctx.stroke();

      } else if (dec.type === 'shell') {
        // Decorative seashell (Scallop)
        const shellGrad = ctx.createLinearGradient(-decScale, -decScale, decScale, decScale);
        if (dec.variant === 0) {
          shellGrad.addColorStop(0, '#fef08a'); // gold shell
          shellGrad.addColorStop(1, '#ca8a04');
        } else {
          shellGrad.addColorStop(0, '#ffedd5'); // creamy pearlescent orange shell
          shellGrad.addColorStop(1, '#ea580c');
        }

        ctx.beginPath();
        ctx.moveTo(0, decScale * 0.8);
        // Draw fan shape scallops
        ctx.bezierCurveTo(-decScale * 1.2, -decScale * 0.6, -decScale * 0.6, -decScale * 1.1, 0, -decScale);
        ctx.bezierCurveTo(decScale * 0.6, -decScale * 1.1, decScale * 1.2, -decScale * 0.6, 0, decScale * 0.8);
        ctx.fillStyle = shellGrad;
        ctx.fill();

        // Draw radial ribs
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        for (let angle = -1.2; angle <= 1.2; angle += 0.3) {
          ctx.beginPath();
          ctx.moveTo(0, decScale * 0.8);
          ctx.lineTo(Math.sin(angle) * decScale, -Math.cos(angle) * decScale * 0.8);
          ctx.stroke();
        }

        // Shell base hinge detail
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.arc(0, decScale * 0.7, decScale * 0.2, 0, Math.PI, true);
        ctx.fill();

      } else if (dec.type === 'leaf') {
        // Zen Maple Leaf
        const leafColors = ['#dc2626', '#d97706', '#059669']; // Red, Orange, Moss Green
        ctx.fillStyle = leafColors[dec.variant % leafColors.length];

        // Draw simple stylized leaf star shape
        ctx.beginPath();
        ctx.moveTo(0, decScale); // base stem
        ctx.lineTo(0, decScale * 0.3);

        // draw points
        const points = [
          { dx: -0.1, dy: 0.1 },
          { dx: -0.5, dy: 0.3 },
          { dx: -0.4, dy: 0.0 },
          { dx: -0.9, dy: -0.2 },
          { dx: -0.5, dy: -0.4 },
          { dx: 0.0, dy: -1.0 }, // center tip
          { dx: 0.5, dy: -0.4 },
          { dx: 0.9, dy: -0.2 },
          { dx: 0.4, dy: 0.0 },
          { dx: 0.5, dy: 0.3 },
          { dx: 0.1, dy: 0.1 }
        ];

        points.forEach(p => {
          ctx.lineTo(p.dx * decScale, p.dy * decScale);
        });

        ctx.closePath();
        ctx.fill();

        // Draw leaf veins
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, decScale * 0.3);
        ctx.lineTo(0, -decScale * 0.8); // main vein
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  // Frame Simulation and Render loop
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Simulate granular settling (multiple times per frame depending on gravity strength)
      let heightChanged = false;
      if (activeSettleRef.current && !isPaused) {
        const iter = parameters.gravityStrength;
        for (let i = 0; i < iter; i++) {
          const changed = performPhysicsStep();
          if (changed) {
            heightChanged = true;
          }
        }

        // Sleep timer optimization
        if (!heightChanged && !isDrawingRef.current) {
          sleepTimerRef.current--;
          if (sleepTimerRef.current <= 0) {
            activeSettleRef.current = false; // put sim to sleep to save CPU
          }
        } else {
          sleepTimerRef.current = 120; // reset sleep grace period
        }
      }

      // 2. Render Sand Heightmap
      renderSand(ctx, canvas.width, canvas.height);

      // 3. Render Placed Stones / Shells / Leaves
      drawDecorations(ctx, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [parameters, isPaused, decorations, currentPreset, theme]);

  // -------------------------------------------------------------
  // MOUSE & DRAWING INTERACTION
  // -------------------------------------------------------------
  const projectMouseToCanvas = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    // Normalised mouse coordinates relative to canvas center [-1, 1]
    const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const my = ((clientY - rect.top) / rect.height) * 2 - 1;

    // Apply inverse 3D tilt/pitch & rotation to get actual heightmap grid projection
    // CSS transformations applied: rotateX(pitch), rotateZ(yaw), scale(zoom)
    // Convert pitch and yaw into radians
    const pitchRad = (cameraPitch * Math.PI) / 180;
    const yawRad = (cameraYaw * Math.PI) / 180;

    // 1. Counteracting pitch compression on Y-axis
    const pyComp = my / Math.cos(pitchRad);

    // 2. Rotate coordinates backwards by the camera Yaw angle
    const rx = mx * Math.cos(-yawRad) - pyComp * Math.sin(-yawRad);
    const ry = mx * Math.sin(-yawRad) + pyComp * Math.cos(-yawRad);

    // 3. Map back to grid units [0, NX] and [0, NY]
    const gridX = Math.round(((rx + 1) / 2) * NX);
    const gridY = Math.round(((ry + 1) / 2) * NY);

    return { x: gridX, y: gridY };
  };

  // Apply brush sculpting actions
  const applyBrush = (cx: number, cy: number, lastPos: { x: number; y: number } | null) => {
    const H = heightRef.current;
    const R = parameters.brushSize;
    const strength = parameters.brushStrength * 0.15;

    // Calculate stroke path (interpolate between mouse steps to ensure smooth contiguous lines)
    const points: Array<{ x: number; y: number }> = [];
    if (lastPos) {
      const dx = cx - lastPos.x;
      const dy = cy - lastPos.y;
      const steps = Math.max(1, Math.floor(Math.sqrt(dx * dx + dy * dy) * 2));
      for (let s = 1; s <= steps; s++) {
        points.push({
          x: lastPos.x + (dx * s) / steps,
          y: lastPos.y + (dy * s) / steps
        });
      }
    } else {
      points.push({ x: cx, y: cy });
    }

    // Apply action for each point on path
    points.forEach(({ x: pcx, y: pcy }) => {
      if (activeTool === 'rake') {
        // Multi-tine rake
        const dx = lastPos ? pcx - lastPos.x : 0;
        const dy = lastPos ? pcy - lastPos.y : 1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const px = -dy / len; // Perpendicular direction
        const py = dx / len;

        // Tine spacing (4 parallel grooves)
        const prongs = [-R * 0.8, -R * 0.25, R * 0.25, R * 0.8];
        prongs.forEach(offset => {
          const tx = pcx + px * offset;
          const ty = pcy + py * offset;
          sculptHeightmapAtPoint(tx, ty, R * 0.25, strength * 2.2, 'finger');
        });
      } else if (activeTool === 'stylus') {
        sculptHeightmapAtPoint(pcx, pcy, R * 0.45, strength * 2.8, activeTool);
      } else if (activeTool === 'wide_brush') {
        sculptHeightmapAtPoint(pcx, pcy, R * 1.6, strength * 1.1, activeTool);
      } else if (activeTool === 'finger') {
        sculptHeightmapAtPoint(pcx, pcy, R, strength * 1.6, activeTool);
      } else {
        sculptHeightmapAtPoint(pcx, pcy, R, strength, activeTool);
      }
    });

    triggerSimulationWake();
  };

  // Sculpting logic for heightmap
  const sculptHeightmapAtPoint = (cx: number, cy: number, R: number, str: number, tool: ToolType) => {
    const H = heightRef.current;
    
    // Bounds check
    const xMin = Math.max(0, Math.floor(cx - R));
    const xMax = Math.min(NX - 1, Math.ceil(cx + R));
    const yMin = Math.max(0, Math.floor(cy - R));
    const yMax = Math.min(NY - 1, Math.ceil(cy + R));

    const cellsToChange: Array<{ idx: number; dist: number; factor: number }> = [];
    let totalRemoved = 0;

    // First scan and calculate displacement values
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d <= R) {
          const idx = y * NX + x;
          let factor = 1.0 - d / R; // 1 at center, 0 at outer edge

          // Apply brush texture modulation to the factor
          let texVal = 1.0;
          if (parameters.brushTexture === 'grainy') {
            let noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            noise = noise - Math.floor(noise);
            texVal = 0.35 + 0.65 * noise;
          } else if (parameters.brushTexture === 'furrowed') {
            texVal = Math.sin((x + y) * 0.9) * 0.45 + 0.55;
          } else if (parameters.brushTexture === 'rough') {
            texVal = Math.sin(x * 0.25) * Math.cos(y * 0.25) * 0.4 + Math.sin(x * 0.1) * 0.15 + 0.65;
            texVal = Math.max(0, texVal);
          } else if (parameters.brushTexture === 'concentric') {
            texVal = Math.sin(d * 0.6) * 0.45 + 0.55;
          }

          factor *= texVal;
          cellsToChange.push({ idx, dist: d, factor });
        }
      }
    }

    if (tool === 'finger' || tool === 'wide_brush' || tool === 'stylus') {
      // Carving/Pushing: Carves inner section, piles up outer ridges (Conservation of Mass)
      let digRadius = R * 0.65;
      let ridgeRadiusMin = R * 0.65;
      let digPower = str * 2.5;

      if (tool === 'stylus') {
        digRadius = R * 0.7;
        ridgeRadiusMin = R * 0.7;
        digPower = str * 3.8; // stylus is sharp and cuts to bedrock
      } else if (tool === 'wide_brush') {
        digRadius = R * 0.8;
        ridgeRadiusMin = R * 0.8;
        digPower = str * 1.5; // broad block sweeps sand flat
      }

      let innerCells: Array<{ idx: number; weight: number }> = [];
      let outerCells: Array<{ idx: number; weight: number }> = [];
      let outerSumWeight = 0;

      cellsToChange.forEach(cell => {
        let texVal = 1.0;
        const x = cell.idx % NX;
        const y = Math.floor(cell.idx / NX);
        
        if (parameters.brushTexture === 'grainy') {
          let noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          noise = noise - Math.floor(noise);
          texVal = 0.35 + 0.65 * noise;
        } else if (parameters.brushTexture === 'furrowed') {
          texVal = Math.sin((x + y) * 0.9) * 0.45 + 0.55;
        } else if (parameters.brushTexture === 'rough') {
          texVal = Math.sin(x * 0.25) * Math.cos(y * 0.25) * 0.4 + Math.sin(x * 0.1) * 0.15 + 0.65;
          texVal = Math.max(0, texVal);
        } else if (parameters.brushTexture === 'concentric') {
          texVal = Math.sin(cell.dist * 0.6) * 0.45 + 0.55;
        }

        if (cell.dist < digRadius) {
          // Inner dig area
          const w = (1.0 - cell.dist / digRadius) * texVal;
          innerCells.push({ idx: cell.idx, weight: w });
        } else if (cell.dist >= ridgeRadiusMin && cell.dist <= R) {
          // Outer pile ridge area
          const w = ((R - cell.dist) / (R - ridgeRadiusMin)) * texVal;
          outerCells.push({ idx: cell.idx, weight: w });
          outerSumWeight += w;
        }
      });

      // 1. Subtract sand from inner
      innerCells.forEach(cell => {
        const amt = cell.weight * digPower;
        const currentH = H[cell.idx];
        const actualRemoved = Math.min(currentH, amt);
        H[cell.idx] -= actualRemoved;
        totalRemoved += actualRemoved;
      });

      // 2. Distribute to outer ridge
      if (outerSumWeight > 0 && totalRemoved > 0) {
        outerCells.forEach(cell => {
          const portion = (cell.weight / outerSumWeight) * totalRemoved * 0.85;
          H[cell.idx] += portion;
          if (H[cell.idx] > 1.3) H[cell.idx] = 1.3;
        });
      }

    } else if (tool === 'flatten') {
      // Trowel flatten tool - levels heights toward average
      let sumH = 0;
      cellsToChange.forEach(c => sumH += H[c.idx]);
      const avgH = cellsToChange.length > 0 ? sumH / cellsToChange.length : 0.45;

      cellsToChange.forEach(c => {
        const target = avgH;
        H[c.idx] = H[c.idx] * (1.0 - c.factor * str) + target * (c.factor * str);
      });

    } else if (tool === 'smooth') {
      // Erosion smooth tool (Gaussian-like Blur)
      cellsToChange.forEach(c => {
        const x = c.idx % NX;
        const y = Math.floor(c.idx / NX);
        
        // 4-neighborhood average
        let count = 0;
        let neighborsSum = 0;
        if (x > 0) { neighborsSum += H[c.idx - 1]; count++; }
        if (x < NX - 1) { neighborsSum += H[c.idx + 1]; count++; }
        if (y > 0) { neighborsSum += H[c.idx - NX]; count++; }
        if (y < NY - 1) { neighborsSum += H[c.idx + NX]; count++; }

        const localAvg = count > 0 ? neighborsSum / count : H[c.idx];
        H[c.idx] = H[c.idx] * (1.0 - c.factor * str * 0.8) + localAvg * (c.factor * str * 0.8);
      });

    } else if (tool === 'fill') {
      // Pouring sand: simple additive height buildup (Cascades down automatically via physics)
      cellsToChange.forEach(c => {
        H[c.idx] += c.factor * str * 0.35;
        if (H[c.idx] > 1.3) H[c.idx] = 1.3;
      });

    } else if (tool === 'eraser') {
      // Resets sand heights back toward clean level baseline
      cellsToChange.forEach(c => {
        const target = 0.45;
        H[c.idx] = H[c.idx] * (1.0 - c.factor * str * 0.3) + target * (c.factor * str * 0.3);
      });
    }
  };

  // Place decoration object at position
  const placeDecoration = (cx: number, cy: number) => {
    if (!activeDecorationType) return;

    // Convert canvas coordinates (0-NX) to normalized relative coordinate (0-1)
    const rx = cx / NX;
    const ry = cy / NY;

    if (rx < 0.05 || rx > 0.95 || ry < 0.05 || ry > 0.95) return; // don't place directly on border wood

    const newDec: PlacedDecoration = {
      id: `${activeDecorationType}_${Date.now()}`,
      type: activeDecorationType,
      x: rx,
      y: ry,
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.4,
      variant: Math.floor(Math.random() * 3),
    };

    setDecorations(prev => [...prev, newDec]);

    // Create a local impression under the decoration in the heightmap (raise a little sand lip around it)
    sculptHeightmapAtPoint(cx, cy, parameters.brushSize * 0.5, 0.4, 'finger');
    triggerSimulationWake();
    setActiveDecorationType(null); // Deselect tool after placement
  };

  // -------------------------------------------------------------
  // EVENT HANDLERS
  // -------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    // Left-click dragging
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (isOrbitMode || e.button === 1 || e.button === 2 || e.shiftKey || e.altKey) {
      // Orbit/Camera dragging (including middle-click button 1, right-click button 2, or Shift/Alt dragging)
      isOrbitDraggingRef.current = true;
      lastScreenMousePosRef.current = { x: clientX, y: clientY };
      e.preventDefault();
    } else {
      // Drawing / Placing Decoration
      const gridPos = projectMouseToCanvas(clientX, clientY);
      if (gridPos) {
        if (activeDecorationType) {
          saveStateToUndo();
          placeDecoration(gridPos.x, gridPos.y);
          onStrokeComplete();
        } else {
          saveStateToUndo();
          isDrawingRef.current = true;
          lastMousePosRef.current = gridPos;
          applyBrush(gridPos.x, gridPos.y, null);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (isOrbitDraggingRef.current && lastScreenMousePosRef.current) {
      // Orbit camera rotation
      const dx = clientX - lastScreenMousePosRef.current.x;
      const dy = clientY - lastScreenMousePosRef.current.y;

      // Adjust Orbit angles
      setCameraYaw(cameraYaw + dx * 0.5);
      setCameraPitch(Math.max(20, Math.min(85, cameraPitch - dy * 0.4)));

      lastScreenMousePosRef.current = { x: clientX, y: clientY };
    } else if (isDrawingRef.current && lastMousePosRef.current) {
      // Perform Drawing
      const gridPos = projectMouseToCanvas(clientX, clientY);
      if (gridPos) {
        applyBrush(gridPos.x, gridPos.y, lastMousePosRef.current);
        lastMousePosRef.current = gridPos;
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastMousePosRef.current = null;
      onStrokeComplete(); // notify parent to update undo-redo indicators
    }
    isOrbitDraggingRef.current = false;
    lastScreenMousePosRef.current = null;
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    const dZoom = -e.deltaY * 0.0015;
    setCameraZoom(Math.max(0.6, Math.min(2.5, cameraZoom + dZoom)));
  };

  // Reset rotation and tilt helper
  const resetCamera = () => {
    setCameraPitch(45);
    setCameraYaw(-45);
    setCameraZoom(1.05);
    setCameraPanX(0);
    setCameraPanY(0);
  };

  const getTrayStyle = () => {
    switch (theme) {
      case 'zen_garden':
        return {
          bg: 'bg-[#2a1d13]', // Dark organic Cedar
          innerBorder: 'border-[#1b1007]'
        };
      case 'beach_side':
        return {
          bg: 'bg-[#b6a18d]', // Sun-bleached coastal driftwood
          innerBorder: 'border-[#827161]'
        };
      case 'minimal_studio':
        return {
          bg: 'bg-[#18181b]', // Polished matte obsidian black
          innerBorder: 'border-[#0a0a0a]'
        };
      default:
        return {
          bg: 'bg-[#3b2314]',
          innerBorder: 'border-[#1e1109]'
        };
    }
  };

  const trayStyle = getTrayStyle();

  return (
    <div
      ref={containerRef}
      id="sandbox-container"
      className="relative flex-1 aspect-square w-full max-w-[540px] flex items-center justify-center p-3 select-none overflow-visible"
    >
      {/* SVG Clip Path Definition for Organic Sand Terrain Plane */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <clipPath id="sand-plane-clip" clipPathUnits="objectBoundingBox">
            <path d="M 0.04,0.05 
                     C 0.18,0.01 0.35,0.04 0.5,0.01 
                     C 0.65,0.03 0.82,0.01 0.96,0.05 
                     C 0.99,0.18 0.97,0.35 0.99,0.5 
                     C 0.98,0.65 0.99,0.82 0.96,0.95 
                     C 0.82,0.99 0.65,0.97 0.5,0.99 
                     C 0.35,0.98 0.18,0.99 0.04,0.95 
                     C 0.01,0.82 0.03,0.65 0.01,0.5 
                     C 0.02,0.35 0.01,0.18 0.04,0.05 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* 3D Rendered Floating Sand Slab Viewport */}
      <div
        id="sandbox-viewport"
        className="relative transition-transform duration-75 ease-out select-none"
        style={{
          transform: `perspective(1000px) rotateX(${cameraPitch}deg) rotateZ(${cameraYaw}deg) scale(${cameraZoom}) translate3d(${cameraPanX}px, ${cameraPanY}px, 0)`,
          transformStyle: 'preserve-3d',
          // Apply realistic soft 3D drop shadow onto the environment floor matching the organic shape
          filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.85)) drop-shadow(0 8px 12px rgba(0,0,0,0.65))',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // prevent context menu on right click orbit
      >
        {/* The Clipped Sand Terrain Plane */}
        <div 
          className="relative overflow-hidden bg-stone-900 rounded-sm"
          style={{
            clipPath: 'url(#sand-plane-clip)',
            width: '512px',
            height: '512px',
          }}
        >
          {/* Sand Simulation Core Canvas */}
          <canvas
            ref={canvasRef}
            id="sand-canvas"
            width={512}
            height={512}
            className="cursor-crosshair block z-0"
          />

          {/* 3D Slab Side Bevel Edge Shading */}
          <div 
            className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_24px_rgba(0,0,0,0.8),inset_0_0_8px_rgba(0,0,0,0.9)]"
            style={{
              clipPath: 'url(#sand-plane-clip)',
            }}
          />

          {/* Top highlight gradient to enhance the volumetric 3D cut slab feel */}
          <div 
            className="absolute inset-0 pointer-events-none z-15 bg-gradient-to-b from-white/10 via-transparent to-black/35 mix-blend-overlay"
            style={{
              clipPath: 'url(#sand-plane-clip)',
            }}
          />
        </div>
      </div>

      {/* Floating 3D Navigation Gizmo Helper overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-30 select-none pointer-events-auto">
        <div className="flex bg-stone-950/80 border border-stone-800/80 rounded-xl p-1.5 shadow-md items-center gap-1.5 backdrop-blur-md">
          <button
            id="orbit-mode-toggle"
            onClick={() => setIsOrbitMode(!isOrbitMode)}
            title={isOrbitMode ? 'Switch to Drawing mode' : 'Switch to Camera Orbit mode'}
            className={`p-2 rounded-lg transition-all ${
              isOrbitMode ? 'bg-amber-400 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
            }`}
          >
            {isOrbitMode ? <RotateCw className="w-4 h-4 animate-spin-slow" /> : <Move className="w-4 h-4" />}
          </button>
          <button
            id="reset-cam"
            onClick={resetCamera}
            title="Reset Camera perspective"
            className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] text-stone-500 font-mono pr-2 border-l border-stone-800 pl-2">
            Orbit Mode: {isOrbitMode ? 'ON (Right click/Drag)' : 'OFF (Draw)'}
          </span>
        </div>
      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

Sandbox.displayName = 'Sandbox';
