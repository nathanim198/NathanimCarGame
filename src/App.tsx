import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Award, Trophy, Info } from 'lucide-react';
import GameCanvas from './components/GameCanvas';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'SCARY_GUY' | 'JUMPSCARE';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [isRefueling, setIsRefueling] = useState(false);
  const [resetFuelSignal, setResetFuelSignal] = useState(false);
  const [gameId, setGameId] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('neon-velocity-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleGameOver = (finalScore: number) => {
    setGameState('JUMPSCARE');
    setTimeout(() => {
      setGameState('GAMEOVER');
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('neon-velocity-highscore', finalScore.toString());
      }
    }, 1200); // Quick jumpscare
  };

  const handleFuelEmpty = () => {
    setGameState('SCARY_GUY');
  };

  const handleScaryGuyAccept = () => {
    setResetFuelSignal(true);
    // Reset signal after a short delay so GameCanvas can see the toggle
    setTimeout(() => {
      setResetFuelSignal(false);
      setGameState('PLAYING');
    }, 100);
  };

  const startGame = () => {
    setScore(0);
    setFuel(100);
    setIsRefueling(false);
    setResetFuelSignal(false);
    setGameId(prev => prev + 1);
    setGameState('PLAYING');
  };

  return (
    <div className="relative w-screen h-screen bg-[#050505] flex flex-col font-sans select-none overflow-hidden">
      {/* HUD - only visible during gameplay */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-col gap-4 z-10 pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0 text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 opacity-70">Distance</span>
              <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {score.toLocaleString()}
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-1 min-w-40 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
               <span className="text-[10px] font-mono uppercase tracking-widest text-[#00ff00] opacity-70">Energy Level</span>
               <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                 <motion.div 
                    initial={false}
                    animate={{ 
                      width: `${fuel}%`, 
                      backgroundColor: fuel > 30 ? '#00ff00' : '#ff0055'
                    }}
                    className="h-full rounded-full shadow-[0_0_10px_rgba(0,255,0,0.3)]"
                 />
               </div>
               <div className="flex justify-between w-full text-[9px] font-mono uppercase text-white/50">
                  <span>E</span>
                  <span className={fuel < 30 ? 'text-[#ff0055] animate-pulse font-bold' : ''}>{fuel}%</span>
                  <span>F</span>
               </div>
            </div>

            <div className="flex flex-col items-end gap-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff0055] opacity-70">Velocity</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-mono font-bold text-white">
                  {speed}
                </span>
                <span className="text-[10px] font-mono text-white opacity-40 uppercase">km/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Surface */}
      <div className="flex-1 w-full h-full relative">
        <GameCanvas 
          isPaused={gameState !== 'PLAYING'} 
          onGameOver={handleGameOver} 
          onScoreChange={setScore}
          onSpeedChange={setSpeed}
          onFuelChange={setFuel}
          onRefuelingChange={setIsRefueling}
          onFuelEmpty={handleFuelEmpty}
          resetFuel={resetFuelSignal}
          gameId={gameId}
        />

        {/* Jumpscare Overlay */}
        <AnimatePresence>
          {gameState === 'JUMPSCARE' && (
            <motion.div 
              initial={{ scale: 3, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: [0, -30, 30, -15, 15, 0],
                y: [0, 15, -15, 8, -8, 0]
              }}
              transition={{ 
                scale: { type: "spring", stiffness: 400, damping: 10 },
                opacity: { duration: 0.05 },
                x: { repeat: Infinity, duration: 0.05 },
                y: { repeat: Infinity, duration: 0.07 }
              }}
              className="absolute inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
            >
              <img 
                src="https://picsum.photos/seed/toxic-zombie/1200/1200" 
                alt="JUMPSCARE" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover grayscale invert contrast-[800%] brightness-[0.2] scale-[2] rotate-12"
              />
              <div className="absolute inset-0 bg-green-950/40 mix-blend-multiply border-[60px] border-black shadow-[inset_0_0_200px_rgba(0,255,0,0.8)]" />
              <motion.div 
                animate={{ 
                  scale: [1, 2, 0.5, 1.5, 1],
                  opacity: [1, 0, 1, 0, 1],
                  rotate: [0, 10, -10, 5, 0]
                }} 
                transition={{ repeat: Infinity, duration: 0.1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 font-black text-8xl md:text-[12rem] italic tracking-tight drop-shadow-[0_0_80px_rgba(255,0,0,1)] z-10"
              >
                INFECTED
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scary Guy Overlay */}
        <AnimatePresence>
          {gameState === 'SCARY_GUY' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6"
            >
              <div className="max-w-lg w-full flex flex-col items-center gap-8 text-center">
                {/* Scary Guy Visual */}
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 0.95, 1.05, 1],
                    filter: ["brightness(1) contrast(1)", "brightness(2) contrast(3)", "brightness(0.5) contrast(2)", "brightness(1) contrast(1)"] 
                  }}
                  transition={{ repeat: Infinity, duration: 0.1, repeatType: "mirror" }}
                  className="relative w-64 h-64 bg-gray-900 rounded-full border-8 border-red-950 overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.5)]"
                >
                  <img 
                    src="https://picsum.photos/seed/creepy-face/600/600" 
                    alt="Scary Guy" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale contrast-[200%] brightness-[0.3]"
                  />
                  <div className="absolute inset-0 bg-red-950/20 mix-blend-overlay" />
                </motion.div>

                <div className="space-y-4">
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-mono text-red-500 font-bold uppercase tracking-tighter"
                  >
                    "Let me fill you fuel..."
                  </motion.p>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest px-8">
                    A mysterious figure looms in the dark. You have no power. You have no choice.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleScaryGuyAccept}
                  className="bg-red-600 hover:bg-red-500 text-white font-black px-16 py-4 rounded-xl text-xl uppercase italic tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all"
                >
                  "Okay then go"
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refueling Overlay */}
        <AnimatePresence>
          {isRefueling && (
             <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none"
             >
                <div className="bg-black/60 border border-[#00ff00]/30 backdrop-blur-md px-10 py-5 rounded-3xl flex flex-col items-center gap-2">
                   <div className="w-8 h-8 rounded-full border-2 border-t-[#00ff00] border-transparent animate-spin mb-2" />
                   <span className="text-2xl font-black italic uppercase tracking-[0.2em] text-[#00ff00] drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                      Refueling
                   </span>
                   <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                      Systems Offline · Stand By
                   </span>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-4 text-white">
                  Nathanim <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">Car Game</span>
                </h1>
                <p className="text-gray-400 text-lg mb-12 max-w-md mx-auto uppercase tracking-widest leading-relaxed">
                  Avoid obstacles. Push the limits. Survive the night.
                </p>

                <div className="flex flex-col items-center gap-6">
                  <button 
                    onClick={startGame}
                    className="group relative flex items-center gap-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black px-12 py-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
                  >
                    <Play className="fill-black w-6 h-6" />
                    <span className="text-xl uppercase italic">Initiate Drive</span>
                  </button>

                  <div className="flex gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest mt-8">
                    <div className="flex items-center gap-2">
                      <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300">AD</kbd>
                      <span>Move</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-gray-300">Space</kbd>
                      <span>Boost</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState === 'GAMEOVER' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050505]/90 backdrop-blur-xl p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-gray-900/50 border border-gray-800 p-8 rounded-3xl text-center"
              >
                <div className="w-20 h-20 bg-[#ff0055]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <RotateCcw className="w-10 h-10 text-[#ff0055]" />
                </div>
                
                <h2 className="text-4xl font-black italic uppercase text-white mb-2">Drive Terminated</h2>
                <p className="text-gray-500 uppercase tracking-widest text-sm mb-8">Collision Detected</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                    <span className="block text-xs font-mono text-gray-500 uppercase mb-1">Final Score</span>
                    <span className="text-3xl font-mono font-bold text-white">{score.toLocaleString()}</span>
                  </div>
                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                    <span className="block text-xs font-mono text-gray-500 uppercase mb-1">High Score</span>
                    <span className="text-3xl font-mono font-bold text-cyan-400">{highScore.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={startGame}
                    className="flex justify-center items-center gap-3 bg-white hover:bg-white/90 text-black font-black py-4 rounded-2xl transition-all uppercase italic"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => setGameState('START')}
                    className="text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"
                  >
                    Return to Mission Control
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer Branding */}
      <div className="p-4 bg-black/50 border-t border-white/5 flex justify-between items-center z-40">
        <div className="flex items-center gap-2 opacity-30">
          <Award className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Pilot OS v4.2.0</span>
        </div>
        <div className="flex items-center gap-6 opacity-40">
           <div className="flex items-center gap-1">
             <Info className="w-3 h-3" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Neon Velocity System</span>
           </div>
        </div>
      </div>
    </div>
  );
}
