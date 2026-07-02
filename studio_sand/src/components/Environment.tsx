import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Sparkles, Wind, Sun, Compass } from 'lucide-react';

interface EnvironmentProps {
  children: React.ReactNode;
  theme: 'zen_garden' | 'beach_side' | 'minimal_studio';
  setTheme: (theme: 'zen_garden' | 'beach_side' | 'minimal_studio') => void;
  isWindEnabled: boolean;
  setIsWindEnabled: (val: boolean) => void;
}

// Procedural Ambient Synthesizer using Web Audio API
class ZenAmbientSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private mainGain: GainNode | null = null;
  private isPlaying = false;

  start() {
    if (this.isPlaying) return;

    try {
      // Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Create brown noise source using a ScriptProcessor (widely compatible)
      const bufferSize = 4096;
      let lastOut = 0.0;
      
      // Use standard script processor node
      this.noiseNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      this.noiseNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Brown noise filter: accumulate white noise and damp it
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Compensate for volume drop
        }
      };

      // Create a lowpass filter to make it sound like wind / waves
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 400;
      this.filterNode.Q.value = 1.0;

      // Create LFO to modulate filter frequency (creates wave/wind washing effect)
      this.lfoNode = this.ctx.createOscillator();
      this.lfoNode.type = 'sine';
      this.lfoNode.frequency.value = 0.12; // 0.12 Hz (one wave cycle every ~8 seconds)

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.value = 250; // Modulate filter cutoff between 150Hz and 650Hz

      // Create main volume gain node
      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.mainGain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 3.0); // Fade in over 3s

      // Connections
      this.noiseNode.connect(this.filterNode);
      
      this.lfoNode.connect(this.lfoGain);
      if (this.filterNode.frequency.setValueAtTime) {
        this.lfoGain.connect(this.filterNode.frequency);
      }
      
      this.filterNode.connect(this.mainGain);
      this.mainGain.connect(this.ctx.destination);

      // Start LFO
      this.lfoNode.start();
      this.isPlaying = true;
    } catch (err) {
      console.warn('Web Audio API is not supported or blocked in this context', err);
    }
  }

  setVolume(vol: number) {
    if (this.mainGain && this.ctx) {
      this.mainGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.5);
    }
  }

  setLfoSpeed(speed: number) {
    if (this.lfoNode) {
      this.lfoNode.frequency.setValueAtTime(speed, this.ctx?.currentTime || 0);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    
    if (this.mainGain && this.ctx) {
      this.mainGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
      setTimeout(() => {
        try {
          this.lfoNode?.stop();
          this.noiseNode?.disconnect();
          this.filterNode?.disconnect();
          this.lfoGain?.disconnect();
          this.mainGain?.disconnect();
          this.ctx?.close();
        } catch (e) {
          // Ignore close errors
        }
        this.isPlaying = false;
      }, 1100);
    } else {
      this.isPlaying = false;
    }
  }
}

// Global instance so it persists across renders
const synth = new ZenAmbientSynthesizer();

export default function Environment({
  children,
  theme,
  setTheme,
  isWindEnabled,
  setIsWindEnabled,
}: EnvironmentProps) {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const leafContainerRef = useRef<HTMLDivElement>(null);

  // Toggle ambient audio
  const toggleAudio = () => {
    if (isAudioPlaying) {
      synth.stop();
      setIsAudioPlaying(false);
    } else {
      // Resume or start
      synth.start();
      // Adjust sound qualities depending on the selected theme
      if (theme === 'beach_side') {
        synth.setLfoSpeed(0.12); // Slow, rolling ocean waves
        synth.setVolume(0.28);
      } else {
        synth.setLfoSpeed(0.06); // Extremely slow, airy wind rustling
        synth.setVolume(0.18);
      }
      setIsAudioPlaying(true);
    }
  };

  // Adjust audio modulation based on theme
  useEffect(() => {
    if (isAudioPlaying) {
      if (theme === 'beach_side') {
        synth.setLfoSpeed(0.12);
        synth.setVolume(0.28);
      } else if (theme === 'zen_garden') {
        synth.setLfoSpeed(0.06);
        synth.setVolume(0.18);
      } else {
        synth.setLfoSpeed(0.04);
        synth.setVolume(0.12);
      }
    }
  }, [theme, isAudioPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      synth.stop();
    };
  }, []);

  // Soft falling leaf/petals animation when wind is enabled
  const [leaves, setLeaves] = useState<Array<{ id: number; left: number; top: number; size: number; delay: number; speed: number; rot: number; type: string }>>([]);

  useEffect(() => {
    if (!isWindEnabled) {
      setLeaves([]);
      return;
    }

    const interval = setInterval(() => {
      setLeaves((prev) => {
        if (prev.length > 15) return prev; // Limit max active leaves

        const types = theme === 'zen_garden' ? ['sakura', 'green_leaf'] : theme === 'beach_side' ? ['sparkle'] : ['dust'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        return [
          ...prev,
          {
            id: Math.random(),
            left: -10 + Math.random() * 60, // Enter from left side
            top: -20 + Math.random() * 30,  // Enter from top
            size: 10 + Math.random() * 20,
            delay: Math.random() * 2,
            speed: 3 + Math.random() * 5,
            rot: Math.random() * 360,
            type: randomType,
          },
        ];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isWindEnabled, theme]);

  // Periodically sweep off dead leaves that finished animating
  useEffect(() => {
    if (!isWindEnabled) return;
    const interval = setInterval(() => {
      setLeaves((prev) => prev.filter((leaf) => leaf.top < 120 && leaf.left < 120));
    }, 5000);
    return () => clearInterval(interval);
  }, [isWindEnabled]);

  return (
    <div
      id="environment-root"
      className={`relative w-full min-h-screen overflow-hidden flex flex-col transition-all duration-1000 select-none ${
        theme === 'zen_garden'
          ? 'bg-gradient-to-br from-[#1b251a] via-[#2c3d2a] to-[#121c11]'
          : theme === 'beach_side'
            ? 'bg-gradient-to-br from-[#122e43] via-[#1b4a6d] to-[#0c1f2e]'
            : 'bg-gradient-to-br from-[#18181b] via-[#27272a] to-[#0f0f11]'
      }`}
    >
      {/* Dynamic Background Overlays per theme */}
      {theme === 'zen_garden' && (
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-color-dodge">
          {/* Bamboo and moss shadows overlay */}
          <div className="absolute -left-10 top-0 w-80 h-full bg-emerald-900 filter blur-3xl rounded-full animate-pulse duration-[8000ms]"></div>
          <div className="absolute -right-10 bottom-0 w-96 h-full bg-green-800 filter blur-3xl rounded-full animate-pulse duration-[12000ms]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        </div>
      )}

      {theme === 'beach_side' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Subtle water caustics / ripples animation */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:200%_200%] animate-[wave-reflect_15s_linear_infinite]"></div>
          <div className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-cyan-700/20 filter blur-[120px] rounded-full animate-pulse duration-[10000ms]"></div>
          <div className="absolute -left-40 -bottom-40 w-[600px] h-[600px] bg-blue-900/30 filter blur-[150px] rounded-full"></div>
        </div>
      )}

      {theme === 'minimal_studio' && (
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          {/* Elegant desk lamp lighting cone */}
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-500/10 filter blur-[120px] rounded-full"></div>
          <div className="absolute -left-20 bottom-1/4 w-96 h-96 bg-zinc-800 filter blur-[80px] rounded-full"></div>
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>
      )}

      {/* Falling Leaves / Petals Layer */}
      <div ref={leafContainerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {leaves.map((leaf) => {
          let bgClass = '';
          let borderRadius = '50%';
          if (leaf.type === 'sakura') {
            bgClass = 'bg-rose-300/60 shadow-[0_0_8px_rgba(244,143,177,0.4)]';
            borderRadius = '100% 0% 100% 100%';
          } else if (leaf.type === 'green_leaf') {
            bgClass = 'bg-emerald-600/40 border border-emerald-500/20';
            borderRadius = '80% 0% 80% 30%';
          } else if (leaf.type === 'sparkle') {
            bgClass = 'bg-cyan-200/50 shadow-[0_0_12px_rgba(165,243,252,0.8)]';
            borderRadius = '50% 0% 50% 0%';
          } else {
            bgClass = 'bg-amber-500/15';
            borderRadius = '50%';
          }

          return (
            <div
              key={leaf.id}
              className={`absolute transition-all duration-1000 ease-linear ${bgClass}`}
              style={{
                left: `${leaf.left + (leaf.top * 0.4)}%`, // blow diagonally
                top: `${leaf.top + 3}%`,
                width: `${leaf.size}px`,
                height: `${leaf.size * 0.7}px`,
                transform: `rotate(${leaf.rot + leaf.top * 2}deg)`,
                borderRadius: borderRadius,
                transition: `top ${1000 / leaf.speed}s linear, left ${1000 / leaf.speed}s linear, transform 1s ease-in-out`,
                opacity: leaf.top > 90 ? 1 - (leaf.top - 90) / 10 : 0.8,
              }}
            />
          );
        })}
      </div>

      {/* Top Atmosphere Bar */}
      <header id="top-bar" className="w-full max-w-7xl mx-auto px-6 pt-5 pb-2 flex justify-between items-center z-30 select-none">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 animate-pulse"></div>
            <h1 className="font-sans font-medium text-lg text-stone-200 tracking-tight">
              Karesansui <span className="text-amber-400/90 font-light font-mono text-sm ml-1">枯山水</span>
            </h1>
          </div>
          <span className="font-mono text-[10px] text-stone-400 mt-0.5 tracking-wider uppercase">
            Interactive Zen Sand Sandbox
          </span>
        </div>

        {/* Ambient Controls */}
        <div className="flex items-center gap-3">
          {/* Theme Selector Pill */}
          <div className="flex bg-stone-900/60 border border-stone-800/80 rounded-full p-1 text-xs text-stone-400">
            <button
              id="theme-zen"
              onClick={() => setTheme('zen_garden')}
              className={`px-3 py-1.5 rounded-full transition-all duration-300 font-sans ${
                theme === 'zen_garden'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'hover:text-stone-200'
              }`}
            >
              Zen Garden
            </button>
            <button
              id="theme-beach"
              onClick={() => setTheme('beach_side')}
              className={`px-3 py-1.5 rounded-full transition-all duration-300 font-sans ${
                theme === 'beach_side'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'hover:text-stone-200'
              }`}
            >
              Beach
            </button>
            <button
              id="theme-studio"
              onClick={() => setTheme('minimal_studio')}
              className={`px-3 py-1.5 rounded-full transition-all duration-300 font-sans ${
                theme === 'minimal_studio'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'hover:text-stone-200'
              }`}
            >
              Studio
            </button>
          </div>

          {/* Wind Button */}
          <button
            id="toggle-wind"
            onClick={() => setIsWindEnabled(!isWindEnabled)}
            title={isWindEnabled ? 'Disable wind effects' : 'Enable gentle wind & drifting leaves'}
            className={`p-2 rounded-full border transition-all duration-300 ${
              isWindEnabled
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                : 'bg-stone-900/60 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            <Wind className="w-4 h-4" />
          </button>

          {/* Audio Synthesizer Toggle */}
          <button
            id="toggle-audio"
            onClick={toggleAudio}
            title={isAudioPlaying ? 'Mute ambient soundscapes' : 'Enable relaxing ocean waves and wind synth'}
            className={`p-2 rounded-full border transition-all duration-300 flex items-center gap-1.5 ${
              isAudioPlaying
                ? 'bg-amber-950/40 border-amber-700/60 text-amber-400 animate-pulse'
                : 'bg-stone-900/60 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
            }`}
          >
            {isAudioPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Sandbox Workspace area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-center gap-6 z-10 relative overflow-visible">
        {children}
      </main>

      {/* Footer credits / Instruction tags */}
      <footer id="env-footer" className="w-full text-center py-4 font-mono text-[9px] text-stone-500 tracking-widest z-10 select-none">
        DRAG MOUSE TO DRAW • HOLD SPACEBAR OR TOGGLE BUTTON TO ROTATE CAMERA • PRESS SAVE TO PERSIST
      </footer>

      {/* Ambient water reflection / wind animation styles */}
      <style>{`
        @keyframes wave-reflect {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  );
}
