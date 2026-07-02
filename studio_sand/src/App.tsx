/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import Environment from './components/Environment';
import { Sandbox, SandboxRef } from './components/Sandbox';
import Sidebar from './components/Sidebar';
import { CameraState, PlacedDecoration, SimParameters, ToolType } from './types';
import { HelpCircle, Sparkles, BookOpen, Camera, Share2, Github } from 'lucide-react';

export default function App() {
  const sandboxRef = useRef<SandboxRef>(null);

  // Simulation Parameters
  const [parameters, setParameters] = useState<SimParameters>({
    brushSize: 10,
    brushStrength: 0.45,
    sandSoftness: 0.012, // default sahara gold softness
    gravityStrength: 3,  // physics updates per tick
    sandColorId: 'golden_desert',
    lightX: 0.4,
    lightY: 0.4,
    lightZ: 1.0,
    lightIntensity: 1.15,
    ambientIntensity: 0.4,
    surfaceRoughness: 0.35,
    shadowSoftness: 1.5,
    wetness: 0.0,
    brushTexture: 'smooth',
  });

  // Active Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('finger');
  const [activeDecorationType, setActiveDecorationType] = useState<'stone' | 'shell' | 'leaf' | null>(null);

  // Environment & theme states
  const [theme, setTheme] = useState<'zen_garden' | 'beach_side' | 'minimal_studio'>('zen_garden');
  const [isWindEnabled, setIsWindEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isOrbitMode, setIsOrbitMode] = useState<boolean>(false);

  // Placed Zen Ornaments state
  const [decorations, setDecorations] = useState<PlacedDecoration[]>([]);

  // Camera Orbit Perspective state
  const [cameraPitch, setCameraPitch] = useState<number>(45);  // Tilt (degrees)
  const [cameraYaw, setCameraYaw] = useState<number>(-45);    // Rotation (degrees)
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);  // Scale
  const [cameraPanX, setCameraPanX] = useState<number>(0);
  const [cameraPanY, setCameraPanY] = useState<number>(0);

  // Undo / Redo history tracking refs (Float32Arrays representing heightmap states)
  const undoStackRef = useRef<Float32Array[]>([]);
  const redoStackRef = useRef<Float32Array[]>([]);

  // We maintain simple react states to enable/disable UI buttons
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Help / Legend Modal
  const [showHelp, setShowHelp] = useState(true);

  // Notification bubble
  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Called whenever a stroke finishes or an undo occurs
  const handleStrokeComplete = () => {
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // Environment actions triggered from Sidebar
  const handleClear = () => {
    if (sandboxRef.current) {
      sandboxRef.current.clearSandbox();
      setDecorations([]);
      handleStrokeComplete();
      triggerNotification('Sandbox cleared');
    }
  };

  const handleReset = (amount: number) => {
    if (sandboxRef.current) {
      sandboxRef.current.resetHeights(amount);
      handleStrokeComplete();
      const levelText = amount < 0.1 ? 'scraped empty' : amount > 0.8 ? 'deep sand fill' : 'half-full sand level';
      triggerNotification(`Reset sand tray to ${levelText}`);
    }
  };

  const handleGenerateTerrain = (type: 'dunes' | 'ripples' | 'sin_ripples' | 'waves' | 'mountains' | 'crater' | 'valley' | 'flat', baseHeight: number = 0.45) => {
    if (sandboxRef.current) {
      sandboxRef.current.generateTerrain(type, baseHeight);
      handleStrokeComplete();
      
      const names = {
        dunes: 'Rolling Dunes',
        ripples: 'Zen Ripples',
        sin_ripples: 'Sinusoidal Wave Ripples',
        waves: 'Fluid Wave Ripples',
        mountains: 'Rugged Peaks',
        crater: 'Volcanic Crater',
        valley: 'Canyon Bed',
        flat: 'Pristine Plain',
      };
      triggerNotification(`Generated ${names[type]} terrain`);
    }
  };

  const handleUndo = () => {
    if (sandboxRef.current) {
      sandboxRef.current.undo();
      triggerNotification('Undo applied');
    }
  };

  const handleRedo = () => {
    if (sandboxRef.current) {
      sandboxRef.current.redo();
      triggerNotification('Redo applied');
    }
  };

  const handleExport = () => {
    if (sandboxRef.current) {
      sandboxRef.current.exportImage();
      triggerNotification('Exported zen art snapshot!');
    }
  };

  const handleSaveToStorage = (name: string) => {
    if (sandboxRef.current) {
      sandboxRef.current.saveToStorage(name);
      triggerNotification(`Saved artwork: "${name}"`);
    }
  };

  const handleLoadFromStorage = (saveDataStr: string) => {
    if (sandboxRef.current) {
      sandboxRef.current.loadFromStorage(saveDataStr);
      try {
        const parsed = JSON.parse(saveDataStr);
        if (parsed.presetId) {
          // Sync preset in parameters
          setParameters(prev => ({
            ...prev,
            sandColorId: parsed.presetId
          }));
        }
        triggerNotification(`Loaded zen garden: "${parsed.name}"`);
      } catch (err) {}
    }
  };

  return (
    <Environment
      theme={theme}
      setTheme={setTheme}
      isWindEnabled={isWindEnabled}
      setIsWindEnabled={setIsWindEnabled}
    >
      {/* Side-by-side Layout Container */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 py-2 relative">
        
        {/* Help Bubble Button (Floating Top Right in environment space) */}
        <button
          id="open-help-modal"
          onClick={() => setShowHelp(true)}
          className="absolute -top-12 right-0 md:right-4 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/60 border border-stone-800 text-xs text-stone-300 rounded-full hover:text-stone-100 transition-all cursor-pointer select-none"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Guide</span>
        </button>

        {/* Sidebar panel (Controls) */}
        <Sidebar
          parameters={parameters}
          setParameters={setParameters}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          onClear={handleClear}
          onReset={handleReset}
          onGenerateTerrain={handleGenerateTerrain}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={handleExport}
          onSaveToStorage={handleSaveToStorage}
          onLoadFromStorage={handleLoadFromStorage}
          canUndo={canUndo}
          canRedo={canRedo}
          activeDecorationType={activeDecorationType}
          setActiveDecorationType={setActiveDecorationType}
        />

        {/* Sandbox panel (The actual 3D visual workspace) */}
        <Sandbox
          ref={sandboxRef}
          parameters={parameters}
          activeTool={activeTool}
          decorations={decorations}
          setDecorations={setDecorations}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          cameraPitch={cameraPitch}
          cameraYaw={cameraYaw}
          cameraZoom={cameraZoom}
          cameraPanX={cameraPanX}
          cameraPanY={cameraPanY}
          setCameraPitch={setCameraPitch}
          setCameraYaw={setCameraYaw}
          setCameraZoom={setCameraZoom}
          setCameraPanX={setCameraPanX}
          setCameraPanY={setCameraPanY}
          onStrokeComplete={handleStrokeComplete}
          undoStackRef={undoStackRef}
          redoStackRef={redoStackRef}
          activeDecorationType={activeDecorationType}
          setActiveDecorationType={setActiveDecorationType}
          isOrbitMode={isOrbitMode}
          setIsOrbitMode={setIsOrbitMode}
          theme={theme}
        />

        {/* Help Legend / Interactive Instructions overlay modal */}
        {showHelp && (
          <div
            id="help-modal-overlay"
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowHelp(false)}
          >
            <div
              id="help-modal-content"
              className="bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col gap-5 text-stone-200"
              onClick={(e) => e.stopPropagation()} // prevent dismiss on modal container click
            >
              <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-sans font-medium text-lg text-stone-100">
                    Karesansui Sand Drawing Guide
                  </h3>
                </div>
                <button
                  id="close-help-btn"
                  onClick={() => setShowHelp(false)}
                  className="font-mono text-xs text-stone-500 hover:text-stone-300 border border-stone-800 rounded-full px-2.5 py-1 transition-all cursor-pointer"
                >
                  Dismiss [Esc]
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs font-sans text-stone-400 leading-relaxed">
                <div>
                  <p className="font-semibold text-stone-200 mb-1">✍️ Drawing & Sculpting</p>
                  <p>
                    Left-click or tap on the sand tray and drag to carve, flatten, or pile. Select different tools from the 
                    <span className="text-amber-400 font-medium"> Tools</span> tab like the Multi-prong Zen Rake, 
                    Thin Twig Stylus, or Trowel leveler.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-stone-200 mb-1">🐚 Placing Zen Ornaments</p>
                  <p>
                    Choose <span className="text-emerald-400 font-medium">Stone</span>, <span className="text-emerald-400 font-medium">Shell</span>, 
                    or <span className="text-emerald-400 font-medium">Leaf</span> under the decorations panel, then tap/click anywhere inside the sand 
                    tray to place them gracefully. Placing objects creates natural sand impressions around them.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-stone-200 mb-1">🎥 3D Camera Controls</p>
                  <p>
                    Hold <kbd className="bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 text-[10px]">Right Click</kbd>, 
                    <kbd className="bg-stone-800 px-1.5 py-0.5 rounded text-stone-300 text-[10px]">Shift Key</kbd>, 
                    or activate the <span className="text-amber-400 font-medium">Orbit Mode</span> button to drag and rotate around the sandbox in full 3D! 
                    Scroll your mouse wheel to zoom in and out.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-stone-200 mb-1">🌊 Sensory Ambience</p>
                  <p>
                    Toggle the <span className="text-amber-400 font-medium">Speaker</span> button in the top header to enable our procedural, 
                    synthesized ocean wave/wind acoustics for a fully relaxing zen meditation.
                  </p>
                </div>
              </div>

              <button
                id="get-started-btn"
                onClick={() => setShowHelp(false)}
                className="w-full bg-amber-400 text-stone-950 font-bold py-3 rounded-xl hover:bg-amber-300 transition-all mt-2 cursor-pointer text-sm"
              >
                Begin Meditation
              </button>
            </div>
          </div>
        )}

        {/* Global Floating Notifications Bubble */}
        {notification && (
          <div
            id="global-notification"
            className="fixed bottom-10 right-10 bg-amber-400 text-stone-950 px-4 py-3 rounded-xl shadow-lg border border-amber-300 font-mono text-xs font-semibold z-50 flex items-center gap-2 animate-bounce"
          >
            <span>✨</span>
            <span>{notification}</span>
          </div>
        )}
      </div>
    </Environment>
  );
}
