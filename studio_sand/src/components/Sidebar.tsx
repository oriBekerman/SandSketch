import React, { useState, useEffect } from 'react';
import {
  Hand,
  Paintbrush,
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Play,
  Pause,
  Save,
  Download,
  Sliders,
  Sun,
  Droplets,
  Plus,
  Compass,
  Sparkles,
  Info,
  Circle,
  Leaf,
  Mountain,
  Waves,
  Layers,
  CircleDot,
  Split,
  Grid,
  Activity,
  RotateCcw,
  Wind
} from 'lucide-react';
import { SimParameters, TOOL_DETAILS, ToolType, SAND_PRESETS } from '../types';

interface SidebarProps {
  parameters: SimParameters;
  setParameters: React.Dispatch<React.SetStateAction<SimParameters>>;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  onClear: () => void;
  onReset: (amount: number) => void;
  onGenerateTerrain: (type: 'dunes' | 'ripples' | 'sin_ripples' | 'waves' | 'mountains' | 'crater' | 'valley' | 'flat', baseHeight?: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onSaveToStorage: (name: string) => void;
  onLoadFromStorage: (data: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  activeDecorationType: 'stone' | 'shell' | 'leaf' | null;
  setActiveDecorationType: (type: 'stone' | 'shell' | 'leaf' | null) => void;
}

export default function Sidebar({
  parameters,
  setParameters,
  activeTool,
  setActiveTool,
  isPaused,
  setIsPaused,
  onClear,
  onReset,
  onGenerateTerrain,
  onUndo,
  onRedo,
  onExport,
  onSaveToStorage,
  onLoadFromStorage,
  canUndo,
  canRedo,
  activeDecorationType,
  setActiveDecorationType,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'settings' | 'saves'>('tools');
  const [saveName, setSaveName] = useState('');
  const [localSaves, setLocalSaves] = useState<any[]>([]);

  // Load saves from localStorage on load
  const loadLocalSavesList = () => {
    try {
      const saves = JSON.parse(localStorage.getItem('zen_sand_saves') || '[]');
      setLocalSaves(saves);
    } catch (e) {
      setLocalSaves([]);
    }
  };

  useEffect(() => {
    loadLocalSavesList();
  }, []);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    onSaveToStorage(saveName.trim());
    setSaveName('');
    loadLocalSavesList();
  };

  const handleDeleteSave = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saves = JSON.parse(localStorage.getItem('zen_sand_saves') || '[]');
      saves.splice(index, 1);
      localStorage.setItem('zen_sand_saves', JSON.stringify(saves));
      loadLocalSavesList();
    } catch (err) {}
  };

  const handlePresetSelect = (id: string) => {
    const selected = SAND_PRESETS.find(p => p.id === id);
    if (selected) {
      setParameters(prev => ({
        ...prev,
        sandColorId: id,
        surfaceRoughness: selected.roughness,
        sandSoftness: selected.softness,
      }));
    }
  };

  const updateParam = (key: keyof SimParameters, val: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  // Helper to get active tool button styling
  const toolButtonClass = (tool: ToolType) => {
    const isSelected = activeTool === tool && activeDecorationType === null;
    return `w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-sans transition-all duration-300 relative group cursor-pointer ${
      isSelected
        ? 'bg-amber-400 border-amber-400 text-stone-950 font-medium shadow-[0_4px_12px_rgba(251,191,36,0.3)]'
        : 'bg-stone-900/60 border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80'
    }`;
  };

  const decorationButtonClass = (type: 'stone' | 'shell' | 'leaf') => {
    const isSelected = activeDecorationType === type;
    return `w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-sans transition-all duration-300 cursor-pointer ${
      isSelected
        ? 'bg-emerald-400 border-emerald-400 text-stone-950 font-medium shadow-[0_4px_12px_rgba(52,211,153,0.3)]'
        : 'bg-stone-900/60 border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80'
    }`;
  };

  return (
    <aside
      id="sidebar-panel"
      className="w-full md:w-[380px] bg-stone-950/85 border border-stone-900 rounded-2xl flex flex-col h-auto md:h-[660px] shadow-[0_20px_40px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden"
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-900 bg-stone-950 p-1">
        <button
          id="tab-tools"
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase rounded-xl transition-all ${
            activeTab === 'tools'
              ? 'bg-stone-900 text-stone-100 font-medium'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Tools
        </button>
        <button
          id="tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-stone-100 font-medium'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          Material
        </button>
        <button
          id="tab-saves"
          onClick={() => setActiveTab('saves')}
          className={`flex-1 py-3 text-xs font-mono tracking-widest uppercase rounded-xl transition-all ${
            activeTab === 'saves'
              ? 'bg-stone-900 text-stone-100 font-medium'
              : 'text-stone-500 hover:text-stone-300'
          }`}
        >
          My Gardens
        </button>
      </div>

      {/* Main Tab Panel Content */}
      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
        {/* TAB 1: TOOLS SECTION */}
        {activeTab === 'tools' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Sculpting Tools Grid */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase">
                  Sculpting Instruments
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="tool-finger"
                  onClick={() => {
                    setActiveTool('finger');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('finger')}
                >
                  <Hand className="w-4 h-4" />
                  <span>Finger</span>
                </button>
                <button
                  id="tool-stylus"
                  onClick={() => {
                    setActiveTool('stylus');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('stylus')}
                >
                  <Pen className="w-4 h-4" />
                  <span>Fine Stylus</span>
                </button>
                <button
                  id="tool-wide-brush"
                  onClick={() => {
                    setActiveTool('wide_brush');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('wide_brush')}
                >
                  <Paintbrush className="w-4 h-4" />
                  <span>Wide Brush</span>
                </button>
                <button
                  id="tool-rake"
                  onClick={() => {
                    setActiveTool('rake');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('rake')}
                >
                  <Compass className="w-4 h-4" />
                  <span>Zen Rake</span>
                </button>
                <button
                  id="tool-flatten"
                  onClick={() => {
                    setActiveTool('flatten');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('flatten')}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Trowel</span>
                </button>
                <button
                  id="tool-smooth"
                  onClick={() => {
                    setActiveTool('smooth');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('smooth')}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Smooth</span>
                </button>
                <button
                  id="tool-fill"
                  onClick={() => {
                    setActiveTool('fill');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('fill')}
                >
                  <Plus className="w-4 h-4" />
                  <span>Pour Sand</span>
                </button>
                <button
                  id="tool-eraser"
                  onClick={() => {
                    setActiveTool('eraser');
                    setActiveDecorationType(null);
                  }}
                  className={toolButtonClass('eraser')}
                >
                  <Eraser className="w-4 h-4" />
                  <span>Leveler</span>
                </button>
              </div>
            </div>

            {/* Placed Decorations Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 mt-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase">
                  Zen Ornaments (Place on canvas)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="ornament-stone"
                  onClick={() => setActiveDecorationType('stone')}
                  className={decorationButtonClass('stone')}
                >
                  <Circle className="w-4 h-4 fill-stone-500/30" />
                  <span className="text-xs">Stone</span>
                </button>
                <button
                  id="ornament-shell"
                  onClick={() => setActiveDecorationType('shell')}
                  className={decorationButtonClass('shell')}
                >
                  <Compass className="w-4 h-4" />
                  <span className="text-xs">Shell</span>
                </button>
                <button
                  id="ornament-leaf"
                  onClick={() => setActiveDecorationType('leaf')}
                  className={decorationButtonClass('leaf')}
                >
                  <Leaf className="w-4 h-4" />
                  <span className="text-xs">Leaf</span>
                </button>
              </div>
            </div>

            {/* Landscape Terrain Architect Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 mt-1.5">
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase">
                  Landscape Sand Terrains
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="terrain-dunes"
                  onClick={() => onGenerateTerrain('dunes', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate rolling desert sand dunes"
                >
                  <Layers className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Dunes</span>
                </button>
                
                <button
                  id="terrain-ripples"
                  onClick={() => onGenerateTerrain('ripples', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate concentric combed ripples"
                >
                  <Waves className="w-4 h-4 text-blue-400/80 group-hover:text-blue-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Ripples</span>
                </button>

                <button
                  id="terrain-sin-ripples"
                  onClick={() => onGenerateTerrain('sin_ripples', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate parallel sinusoidal sand waves"
                >
                  <Activity className="w-4 h-4 text-cyan-400/80 group-hover:text-cyan-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Sin Ripples</span>
                </button>

                <button
                  id="terrain-waves"
                  onClick={() => onGenerateTerrain('waves', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate fluid multi-directional overlapping wave ripples"
                >
                  <Wind className="w-4 h-4 text-sky-400/80 group-hover:text-sky-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Wave Ripples</span>
                </button>

                <button
                  id="terrain-peaks"
                  onClick={() => onGenerateTerrain('mountains', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate spiky mountains and peaks"
                >
                  <Mountain className="w-4 h-4 text-emerald-400/80 group-hover:text-emerald-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Peaks</span>
                </button>

                <button
                  id="terrain-crater"
                  onClick={() => onGenerateTerrain('crater', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate a large circular sand crater bowl"
                >
                  <CircleDot className="w-4 h-4 text-rose-400/80 group-hover:text-rose-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Crater</span>
                </button>

                <button
                  id="terrain-valley"
                  onClick={() => onGenerateTerrain('valley', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Generate a diag dividing canyon valley"
                >
                  <Split className="w-4 h-4 text-indigo-400/80 group-hover:text-indigo-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Valley</span>
                </button>

                <button
                  id="terrain-flat"
                  onClick={() => onGenerateTerrain('flat', 0.45)}
                  className="bg-stone-900/60 border border-stone-800/80 text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 hover:border-stone-700/80 p-2 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  title="Reset to flat pristine sand sheet"
                >
                  <Grid className="w-4 h-4 text-stone-400/80 group-hover:text-stone-300 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-[10px] font-sans font-medium">Plain</span>
                </button>
              </div>
            </div>

            {/* Brush Settings Area */}
            <div className="bg-stone-900/30 border border-stone-900 rounded-xl p-4 mt-2">
              <div className="flex justify-between text-xs font-mono text-stone-400 mb-4">
                <span>Brush Dimensions</span>
                <span className="text-amber-400">R: {parameters.brushSize}px</span>
              </div>
              
              {/* Brush Size Slider */}
              <div className="flex flex-col gap-1 mb-4">
                <input
                  id="brush-size-slider"
                  type="range"
                  min="2"
                  max="35"
                  step="0.5"
                  value={parameters.brushSize}
                  onChange={(e) => updateParam('brushSize', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="flex justify-between text-xs font-mono text-stone-400 mb-1">
                <span>Brush Pressure</span>
                <span className="text-amber-400">{Math.round(parameters.brushStrength * 100)}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  id="brush-strength-slider"
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={parameters.brushStrength}
                  onChange={(e) => updateParam('brushStrength', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Adjustable Brush Texture Setting */}
              <div className="mt-4 pt-4 border-t border-stone-800/40">
                <div className="flex justify-between text-xs font-mono text-stone-400 mb-2">
                  <span>Brush Texture</span>
                  <span className="text-amber-400 capitalize">{parameters.brushTexture}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 bg-stone-900/40 p-1 rounded-xl border border-stone-800/40">
                  {[
                    { id: 'smooth', label: 'Smooth', title: 'Standard smooth falloff' },
                    { id: 'grainy', label: 'Grainy', title: 'Scatter dry granular sand' },
                    { id: 'furrowed', label: 'Furrow', title: 'Parallel raked groves' },
                    { id: 'rough', label: 'Rough', title: 'Craggy organic branch stroke' },
                    { id: 'concentric', label: 'Ring', title: 'Concentric drop waves' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      id={`brush-tex-${t.id}`}
                      onClick={() => updateParam('brushTexture', t.id)}
                      className={`py-1.5 px-0.5 text-[9px] font-medium rounded-lg border cursor-pointer transition-all text-center leading-tight truncate ${
                        parameters.brushTexture === t.id
                          ? 'bg-amber-400 border-amber-400 text-stone-950 font-bold'
                          : 'bg-stone-950/60 border-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                      }`}
                      title={t.title}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-stone-900/10 border border-stone-900/40 rounded-xl p-3 flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                {activeDecorationType
                  ? `Ornament Mode: Click on the sand tray area to drop a beautiful decorative ${activeDecorationType}.`
                  : TOOL_DETAILS[activeTool]?.description || 'Click and drag on sand to carve/mold.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: MATERIAL & PRESETS */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Color/Sand Presets */}
            <div>
              <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase block mb-3">
                Select Sand Grain Type
              </span>
              <div className="flex flex-col gap-2">
                {SAND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`w-full p-3 rounded-xl border text-left font-sans transition-all flex items-center gap-3.5 ${
                      parameters.sandColorId === preset.id
                        ? 'bg-stone-900 border-amber-500/50 text-stone-100 shadow-md'
                        : 'bg-stone-900/30 border-stone-900 text-stone-400 hover:text-stone-300 hover:bg-stone-900/60'
                    }`}
                  >
                    {/* Circle Swatch */}
                    <div
                      className="w-7 h-7 rounded-full border border-stone-950/60 shrink-0 shadow-inner"
                      style={{ backgroundColor: preset.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-stone-200">{preset.name}</span>
                      <span className="text-[10px] text-stone-500 mt-0.5 leading-tight line-clamp-1">
                        {preset.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Viscosity/Wetness Controls */}
            <div className="bg-stone-900/30 border border-stone-900 rounded-xl p-4 mt-1">
              <div className="flex justify-between text-xs font-mono text-stone-400 mb-2 items-center">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dampness / Moisture</span>
                </div>
                <span className="text-blue-400">{parameters.wetness > 0 ? `${Math.round(parameters.wetness * 100)}%` : 'Dry'}</span>
              </div>
              <input
                id="sand-wetness-slider"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={parameters.wetness}
                onChange={(e) => updateParam('wetness', parseFloat(e.target.value))}
                className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
              <p className="text-[10px] text-stone-500 mt-2 font-sans">
                Wet sand is stickier, slides down slower, and sustains deeper ridges.
              </p>
            </div>

            {/* Sliders for gravity & detail */}
            <div className="bg-stone-900/30 border border-stone-900 rounded-xl p-4 flex flex-col gap-4">
              {/* Roughness */}
              <div>
                <div className="flex justify-between text-xs font-mono text-stone-400 mb-2">
                  <span>Grain Roughness</span>
                  <span className="text-stone-300">{Math.round(parameters.surfaceRoughness * 100)}%</span>
                </div>
                <input
                  id="sand-roughness-slider"
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={parameters.surfaceRoughness}
                  onChange={(e) => updateParam('surfaceRoughness', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-stone-300"
                />
              </div>

              {/* Softness */}
              <div>
                <div className="flex justify-between text-xs font-mono text-stone-400 mb-2">
                  <span>Angle of Repose (Erosion)</span>
                  <span className="text-stone-300">{(parameters.sandSoftness * 1000).toFixed(0)}</span>
                </div>
                <input
                  id="sand-softness-slider"
                  type="range"
                  min="0.005"
                  max="0.04"
                  step="0.001"
                  value={parameters.sandSoftness}
                  onChange={(e) => updateParam('sandSoftness', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-stone-300"
                />
              </div>
            </div>

            {/* Lighting Direction Controls */}
            <div className="bg-stone-900/30 border border-stone-900 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase">
                  Directional Sun Position
                </span>
              </div>

              {/* Light Angle Slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-stone-400 mb-2">
                  <span>Sun Angle (East - West)</span>
                  <span className="text-amber-400">{(parameters.lightX * 90).toFixed(0)}°</span>
                </div>
                <input
                  id="light-x-slider"
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.05"
                  value={parameters.lightX}
                  onChange={(e) => updateParam('lightX', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-stone-400 mb-2">
                  <span>Sun Altitude (Noon - Dusk)</span>
                  <span className="text-amber-400">{parameters.lightZ.toFixed(2)}x</span>
                </div>
                <input
                  id="light-z-slider"
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={parameters.lightZ}
                  onChange={(e) => updateParam('lightZ', parseFloat(e.target.value))}
                  className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAVED GARDENS */}
        {activeTab === 'saves' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Create Save Slot */}
            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-2.5">
              <span className="font-mono text-[10px] tracking-wider text-stone-400 uppercase">
                Save Current Masterpiece
              </span>
              <div className="flex gap-2">
                <input
                  id="save-name-input"
                  type="text"
                  placeholder="Enter garden name..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 outline-none focus:border-amber-500/50"
                />
                <button
                  id="save-btn"
                  type="submit"
                  className="bg-amber-400 text-stone-950 px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>

            {/* List of saves */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="font-mono text-[10px] tracking-wider text-stone-500 uppercase">
                Saved Galleries ({localSaves.length})
              </span>
              {localSaves.length === 0 ? (
                <div className="py-8 text-center text-stone-600 font-mono text-xs border border-dashed border-stone-900 rounded-xl">
                  No saved gardens found.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {localSaves.map((save, idx) => (
                    <div
                      key={idx}
                      onClick={() => onLoadFromStorage(JSON.stringify(save))}
                      className="bg-stone-900/40 hover:bg-stone-900/80 border border-stone-900 rounded-xl p-3 flex justify-between items-center cursor-pointer group transition-all"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-stone-200 group-hover:text-amber-400 transition-all">
                          {save.name}
                        </span>
                        <span className="text-[9px] text-stone-500 font-mono">
                          {new Date(save.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSave(idx, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-all cursor-pointer"
                        title="Delete Save"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div id="sidebar-footer-actions" className="border-t border-stone-900 bg-stone-950/60 p-4 flex flex-col gap-3">
        {/* Undo Redo Simulation Toggles */}
        <div className="flex gap-2">
          <button
            id="action-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
              canUndo
                ? 'bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800'
                : 'bg-stone-950 border-stone-950 text-stone-700 cursor-not-allowed'
            }`}
            title="Undo stroke"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            id="action-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
              canRedo
                ? 'bg-stone-900 border-stone-800 text-stone-200 hover:bg-stone-800'
                : 'bg-stone-950 border-stone-950 text-stone-700 cursor-not-allowed'
            }`}
            title="Redo stroke"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
        </div>

        {/* Play/Pause Clear Export */}
        <div className="flex gap-2">
          <button
            id="action-pause"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-mono cursor-pointer transition-all ${
              isPaused
                ? 'bg-amber-950/40 border-amber-800/50 text-amber-400'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={isPaused ? 'Resume live simulation' : 'Pause sand cascade stabilization'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            id="action-reset-sand"
            onClick={() => onReset(0.45)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 hover:text-white font-medium text-xs cursor-pointer transition-all"
            title="Reset sand heights to standard level"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span>Reset Sand</span>
          </button>
          
          <button
            id="action-export"
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs cursor-pointer transition-all"
            title="Download PNG screenshot"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Art</span>
          </button>

          <button
            id="action-clear"
            onClick={onClear}
            className="px-3.5 py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-950/40 hover:border-red-800 transition-all cursor-pointer"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Flat Seed Buttons */}
        <div className="flex gap-1 bg-stone-900/20 rounded-lg p-0.5 border border-stone-900/40 items-center justify-between">
          <span className="text-[9px] font-mono text-stone-500 pl-1.5 uppercase">Re-seed Sand level:</span>
          <div className="flex gap-1">
            <button
              id="reseed-empty"
              onClick={() => onReset(0.01)}
              className="px-2 py-1 bg-stone-900 text-stone-400 text-[9px] font-mono rounded hover:text-stone-200 cursor-pointer"
            >
              Empty
            </button>
            <button
              id="reseed-mid"
              onClick={() => onReset(0.45)}
              className="px-2 py-1 bg-stone-900 text-stone-400 text-[9px] font-mono rounded hover:text-stone-200 cursor-pointer"
            >
              Half
            </button>
            <button
              id="reseed-full"
              onClick={() => onReset(0.95)}
              className="px-2 py-1 bg-stone-900 text-stone-400 text-[9px] font-mono rounded hover:text-stone-200 cursor-pointer"
            >
              Deep
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
