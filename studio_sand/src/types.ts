export type ToolType =
  | 'finger'
  | 'wide_brush'
  | 'stylus'
  | 'rake'
  | 'flatten'
  | 'smooth'
  | 'fill'
  | 'eraser'
  | 'stone'
  | 'shell'
  | 'leaf';

export interface SandPreset {
  id: string;
  name: string;
  color: string;
  roughness: number;
  softness: number;
  description: string;
}

export interface SimParameters {
  brushSize: number;       // 1 to 40
  brushStrength: number;   // 0.05 to 1.0
  sandSoftness: number;    // 0.005 to 0.04 (defines angle of repose)
  gravityStrength: number; // 1 to 5 iterations per frame
  sandColorId: string;     // preset id
  lightX: number;          // -1.0 to 1.0 (light direction)
  lightY: number;          // -1.0 to 1.0
  lightZ: number;          // 0.2 to 2.0 (light height)
  lightIntensity: number;  // 0.5 to 2.0
  ambientIntensity: number;// 0.1 to 1.0
  surfaceRoughness: number;// 0.0 to 1.0
  shadowSoftness: number;  // 0.5 to 4.0
  wetness: number;         // 0.0 (dry) to 1.0 (very wet, sticky)
  brushTexture: 'smooth' | 'grainy' | 'furrowed' | 'rough' | 'concentric';
}

export interface PlacedDecoration {
  id: string;
  type: 'stone' | 'shell' | 'leaf';
  x: number;               // 0 to 1 coordinates (relative)
  y: number;
  rotation: number;        // radians
  scale: number;           // size modifier
  variant: number;         // which design to use (0, 1, 2)
}

export interface CameraState {
  pitch: number;  // Rotation around X axis (tilt, 15 to 90 deg)
  yaw: number;    // Rotation around Z axis (orbit, -180 to 180 deg)
  zoom: number;   // Scale factor (0.5 to 2.0)
  panX: number;   // Translate X
  panY: number;   // Translate Y
}

export const SAND_PRESETS: SandPreset[] = [
  {
    id: 'golden_desert',
    name: 'Sahara Gold',
    color: '#e2af66',
    roughness: 0.35,
    softness: 0.012,
    description: 'Classic warm desert sand with highly visible granular texture.',
  },
  {
    id: 'zen_white',
    name: 'Kyoto White',
    color: '#eae5d9',
    roughness: 0.2,
    softness: 0.018,
    description: 'Fine, light quartz sand perfect for formal Zen garden raking.',
  },
  {
    id: 'volcanic_black',
    name: 'Icelandic Basalt',
    color: '#2a2a2c',
    roughness: 0.6,
    softness: 0.008,
    description: 'Coarse, dark volcanic sand with rich structural shading.',
  },
  {
    id: 'terracotta_red',
    name: 'Ayers Red',
    color: '#b2533e',
    roughness: 0.4,
    softness: 0.014,
    description: 'Rich iron-oxide red clay sand reminiscent of the Australian outback.',
  },
  {
    id: 'sakura_pink',
    name: 'Sakura Petal',
    color: '#f0c1ca',
    roughness: 0.25,
    softness: 0.02,
    description: 'Charming pastel pink sand creating a dream-like artistic canvas.',
  },
];

export const TOOL_DETAILS = {
  finger: {
    name: 'Finger Draw',
    description: 'Draw with your fingertip, carving a channel while raising side dunes.',
  },
  wide_brush: {
    name: 'Wide Brush',
    description: 'A broad sweeping wooden block that clears wide pathways.',
  },
  stylus: {
    name: 'Fine Stylus',
    description: 'An elegant thin twig that carves delicate, sharp-edged patterns.',
  },
  rake: {
    name: 'Zen Rake',
    description: 'Traditional wooden rake with four prongs for drawing parallel dunes.',
  },
  flatten: {
    name: 'Trowel / Flatten',
    description: 'Level out high peaks and fill deep trenches, compacting the surface.',
  },
  smooth: {
    name: 'Smooth / Mist',
    description: 'Soften sharp ridges and blur details, creating weathered slopes.',
  },
  fill: {
    name: 'Pour Sand',
    description: 'Gently sprinkle more sand from above, building high conical piles.',
  },
  eraser: {
    name: 'Smoothing Board',
    description: 'Gently drag a board to reset the heightmap to a level plane.',
  },
  stone: {
    name: 'Zen Stone',
    description: 'Place smooth river stones to create points of focal meditation.',
  },
  shell: {
    name: 'Scallop Shell',
    description: 'Add a decorative fan-shaped scallop shell or spiral sea shell.',
  },
  leaf: {
    name: 'Maple Leaf',
    description: 'Scatter golden maple leaves across your garden scene.',
  },
};
