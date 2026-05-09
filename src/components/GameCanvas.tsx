import { useEffect, useRef, useState } from 'react';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface GameCanvasProps {
  isPaused: boolean;
  onGameOver: (score: number) => void;
  onScoreChange: (score: number) => void;
  onSpeedChange: (speed: number) => void;
  onFuelChange: (fuel: number) => void;
  onRefuelingChange: (isRefueling: boolean) => void;
  onFuelEmpty: () => void;
  resetFuel?: boolean;
  gameId?: number;
}

type ObstacleType = 'CAR' | 'SWEEPER' | 'PHASER' | 'BARRIER' | 'FUEL';

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  speedY: number;
  speedX?: number;
  color: string;
  glowColor: string;
  type: ObstacleType;
  phase?: number; // For PHASER flickering
  direction?: number; // For SWEEPER
}

export default function GameCanvas({ isPaused, onGameOver, onScoreChange, onSpeedChange, onFuelChange, onRefuelingChange, onFuelEmpty, resetFuel, gameId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const scaryImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = 'https://picsum.photos/seed/scary-eye/100/100'; // Scary eye/face seed
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      scaryImageRef.current = img;
    };
  }, []);
  
  // Game State Refs
  const playerRef = useRef<Entity>({
    type: 'CAR',
    x: 0,
    y: 0,
    width: 36,
    height: 64,
    speedY: 0,
    color: '#00ccff',
    glowColor: 'rgba(0, 204, 255, 0.5)'
  });

  useEffect(() => {
    if (resetFuel) {
      fuelRef.current = 100;
      onFuelChange(100);
      // Small speed boost
      speedRef.current = Math.max(5, speedRef.current - 1);
    }
  }, [resetFuel]);
  
  const obstaclesRef = useRef<Entity[]>([]);
  const roadLinesRef = useRef<{ y: number }[]>([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(12);
  const fuelRef = useRef(100);
  const gameStateRef = useRef({
    lastObstacleSpawn: 0,
    lastTick: 0,
    isGameOver: false,
    isRefueling: false,
    refuelTimer: 0,
    keys: { Left: false, Right: false },
    touchX: null as number | null,
  });

  const initGame = (width: number, height: number) => {
    // Dynamic scaling based on width
    const playerWidth = Math.min(width * 0.12, 60); 
    playerRef.current.width = playerWidth;
    playerRef.current.height = playerWidth * 1.75;
    
    playerRef.current.x = width / 2 - playerRef.current.width / 2;
    playerRef.current.y = height - playerRef.current.height - 15;
    obstaclesRef.current = [];
    roadLinesRef.current = Array.from({ length: 12 }, (_, i) => ({ y: (height / 10) * i - 100 }));
    scoreRef.current = 0;
    speedRef.current = 12;
    fuelRef.current = 100;
    gameStateRef.current.isGameOver = false;
    gameStateRef.current.isRefueling = false;
    onScoreChange(0);
    onSpeedChange(12);
    onFuelChange(100);
    onRefuelingChange(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        initGame(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const update = (time: number) => {
    if (isPaused || gameStateRef.current.isGameOver) return;

    if (!gameStateRef.current.lastTick) {
      gameStateRef.current.lastTick = time;
      return;
    }

    const deltaTime = (time - gameStateRef.current.lastTick) / 16.67; // normalize to 60fps
    gameStateRef.current.lastTick = time;

    const { width, height } = canvasRef.current!;

    // Refueling logic
    if (gameStateRef.current.isRefueling) {
      gameStateRef.current.refuelTimer += 16.67 * deltaTime;
      if (fuelRef.current < 100) {
        fuelRef.current += 1 * deltaTime;
        if (fuelRef.current > 100) fuelRef.current = 100;
        onFuelChange(Math.floor(fuelRef.current));
      }

      if (gameStateRef.current.refuelTimer > 1500) { // 1.5 seconds refueling
        gameStateRef.current.isRefueling = false;
        gameStateRef.current.refuelTimer = 0;
        onRefuelingChange(false);
        // Move any obstacle out of the way or clear them near car to avoid instant death
        obstaclesRef.current = obstaclesRef.current.filter(obs => obs.y > playerRef.current.y + 100 || obs.y < playerRef.current.y - 150);
      }
      return; // Stop update loop during refueling
    }

    // Move Player
    const moveSpeed = (playerRef.current.width * 0.45) * deltaTime;
    if (gameStateRef.current.keys.Left && playerRef.current.x > 20) {
      playerRef.current.x -= moveSpeed;
    }
    if (gameStateRef.current.keys.Right && playerRef.current.x < width - playerRef.current.width - 20) {
      playerRef.current.x += moveSpeed;
    }

    // Touch handle
    if (gameStateRef.current.touchX !== null) {
      const targetX = gameStateRef.current.touchX - playerRef.current.width / 2;
      const dx = targetX - playerRef.current.x;
      if (Math.abs(dx) > 5) {
        playerRef.current.x += Math.sign(dx) * moveSpeed;
      }
    }

    // Move road lines
    roadLinesRef.current.forEach(line => {
      line.y += speedRef.current * deltaTime;
      if (line.y > height) line.y = -100;
    });

    // Speed up
    speedRef.current += 0.004 * deltaTime;
    onSpeedChange(Math.floor(speedRef.current * 20)); // For display

    // Fuel Consumption
    fuelRef.current -= 0.008 * deltaTime * (speedRef.current / 5);
    if (fuelRef.current <= 0) {
      fuelRef.current = 0;
      onFuelEmpty();
    }
    onFuelChange(Math.floor(fuelRef.current));

    // Update obstacles
    const spawnThreshold = 1400 / (speedRef.current / 5);
    if (time - gameStateRef.current.lastObstacleSpawn > spawnThreshold) {
      const types: ObstacleType[] = ['CAR', 'SWEEPER', 'PHASER', 'BARRIER', 'FUEL'];
      // Weigh types based on speed
      let type: ObstacleType = 'CAR';
      const rand = Math.random();
      
      // Specifically spawn fuel periodically
      if (fuelRef.current < 40 && Math.random() > 0.6) {
        type = 'FUEL';
      } else if (speedRef.current > 7) {
        if (rand > 0.9) type = 'FUEL';
        else if (rand > 0.8) type = 'SWEEPER';
        else if (rand > 0.6) type = 'PHASER';
        else if (rand > 0.4) type = 'BARRIER';
      } else if (speedRef.current > 6) {
        if (rand > 0.9) type = 'FUEL';
        else if (rand > 0.7) type = 'BARRIER';
      } else {
        if (rand > 0.95) type = 'FUEL';
      }

      let obstacleWidth = playerRef.current.width;
      let obstacleHeight = playerRef.current.height;
      const colors = [
        '#ff0055', '#ffcc00', '#ff00ff', '#00ffcc', '#ff6600', '#cc00ff', '#00ff66', 
        '#ff3300', '#ffff00', '#33ff00', '#00ffff', '#0033ff', '#6600ff', '#ff0099',
        '#ff9900', '#99ff00', '#00ff99', '#0099ff', '#9900ff', '#f0f0f0'
      ];
      let color = colors[Math.floor(Math.random() * colors.length)];
      let speedY = speedRef.current * (0.8 + Math.random() * 0.4);

      if (type === 'BARRIER') {
        obstacleWidth = width * 0.3;
        obstacleHeight = 30;
        color = '#ffffff';
        speedY = speedRef.current;
      } else if (type === 'PHASER') {
        color = '#00ffcc';
      } else if (type === 'SWEEPER') {
        color = '#ffcc00';
      } else if (type === 'FUEL') {
        obstacleWidth = 60;
        obstacleHeight = 60;
        color = '#00ff00';
        speedY = speedRef.current; // Fuel stations move at road speed
      }

      const x = Math.random() * (width - obstacleWidth - 40) + 20;
      
      obstaclesRef.current.push({
        type,
        x,
        y: -150,
        width: obstacleWidth,
        height: obstacleHeight,
        speedY,
        speedX: type === 'SWEEPER' ? (Math.random() - 0.5) * 4 : 0,
        color,
        glowColor: color + '80',
        phase: 0,
        direction: Math.random() > 0.5 ? 1 : -1
      });
      gameStateRef.current.lastObstacleSpawn = time;
    }

    obstaclesRef.current = obstaclesRef.current.filter(obs => {
      obs.y += obs.speedY * deltaTime;
      
      // Type specific behavior
      if (obs.type === 'SWEEPER') {
        obs.x += (obs.speedX || 2) * deltaTime;
        if (obs.x < 20 || obs.x > width - obs.width - 20) {
          obs.speedX = -(obs.speedX || 2);
        }
      } else if (obs.type === 'PHASER') {
        obs.phase = ((obs.phase || 0) + 0.05 * deltaTime) % (Math.PI * 2);
      }

      // Collision Detection
      const isVisible = obs.type !== 'PHASER' || Math.sin(obs.phase || 0) > -0.3;
      if (isVisible) {
        if (
          playerRef.current.x < obs.x + obs.width &&
          playerRef.current.x + playerRef.current.width > obs.x &&
          playerRef.current.y < obs.y + obs.height &&
          playerRef.current.y + playerRef.current.height > obs.y
        ) {
          if (obs.type === 'FUEL') {
            gameStateRef.current.isRefueling = true;
            onRefuelingChange(true);
            return false; // Remove fuel station after interaction
          } else {
            gameStateRef.current.isGameOver = true;
            onGameOver(Math.floor(scoreRef.current));
          }
        }
      }

      return obs.y < height + 150;
    });

    // Scoring
    scoreRef.current += 0.1 * deltaTime * (speedRef.current / 5);
    onScoreChange(Math.floor(scoreRef.current));
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // Road grid / lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    const gridSize = Math.max(50, width / 12);
    for (let i = 0; i < width; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Lane markings
    ctx.setLineDash([40, 40]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    roadLinesRef.current.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(width * 0.33, line.y);
      ctx.lineTo(width * 0.33, line.y + height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width * 0.66, line.y);
      ctx.lineTo(width * 0.66, line.y + height);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Bloom/Glow helper
    const drawEntity = (ent: Entity, isPlayer = false) => {
      const isVisible = ent.type !== 'PHASER' || Math.sin(ent.phase || 0) > -0.3;
      const opacity = ent.type === 'PHASER' ? Math.max(0.1, Math.sin(ent.phase || 0) + 0.5) : 1;
      
      if (!isVisible && ent.type === 'PHASER') {
         ctx.globalAlpha = 0.1;
      } else {
         ctx.globalAlpha = opacity;
      }

      ctx.shadowBlur = 15;
      ctx.shadowColor = ent.glowColor;
      ctx.fillStyle = ent.color;

      if (ent.type === 'BARRIER') {
        // Draw a technological barrier/wall
        ctx.beginPath();
        ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 4);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        // Caution stripes
        ctx.save();
        ctx.clip();
        for (let i = -ent.height; i < ent.width; i += 10) {
          ctx.beginPath();
          ctx.moveTo(ent.x + i, ent.y);
          ctx.lineTo(ent.x + i + ent.height, ent.y + ent.height);
          ctx.stroke();
        }
        ctx.restore();
      } else if (ent.type === 'FUEL') {
        // Draw Fuel House / Station
        ctx.beginPath();
        ctx.roundRect(ent.x, ent.y, ent.width, ent.height, 10);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#050505';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FUEL', ent.x + ent.width / 2, ent.y + ent.height / 2 + 5);
        
        // Pump details
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ent.x + 10, ent.y + 10, ent.width - 20, ent.height - 20);
      } else {
        // Car Body
        const r = 8;
        ctx.beginPath();
        if (isPlayer) {
          ctx.roundRect(ent.x, ent.y, ent.width, ent.height, r);
          ctx.fill();
        } else {
          // Scary Car Body - more jagged/rugged
          ctx.moveTo(ent.x + r, ent.y);
          ctx.lineTo(ent.x + ent.width - r, ent.y);
          ctx.quadraticCurveTo(ent.x + ent.width, ent.y, ent.x + ent.width, ent.y + r);
          // Add some spikes on the sides
          ctx.lineTo(ent.x + ent.width, ent.y + ent.height * 0.3);
          ctx.lineTo(ent.x + ent.width + 5, ent.y + ent.height * 0.4);
          ctx.lineTo(ent.x + ent.width, ent.y + ent.height * 0.5);
          
          ctx.lineTo(ent.x + ent.width, ent.y + ent.height - r);
          ctx.quadraticCurveTo(ent.x + ent.width, ent.y + ent.height, ent.x + ent.width - r, ent.y + ent.height);
          ctx.lineTo(ent.x + r, ent.y + ent.height);
          ctx.quadraticCurveTo(ent.x, ent.y + ent.height, ent.x, ent.y + ent.height - r);
          
          // Other side spikes
          ctx.lineTo(ent.x, ent.y + ent.height * 0.5);
          ctx.lineTo(ent.x - 5, ent.y + ent.height * 0.4);
          ctx.lineTo(ent.x, ent.y + ent.height * 0.3);
          
          ctx.lineTo(ent.x, ent.y + r);
          ctx.quadraticCurveTo(ent.x, ent.y, ent.x + r, ent.y);
          ctx.fill();
        }

        // Details
        ctx.shadowBlur = 0;
        
        if (isPlayer) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(ent.x + 5, ent.y + 15, ent.width - 10, 15);
          ctx.fillStyle = '#fff';
          ctx.fillRect(ent.x + 5, ent.y + 5, 8, 4);
          ctx.fillRect(ent.x + ent.width - 13, ent.y + 5, 8, 4);
        } else {
          // Scary Details
          // Glowing Eyes (Red)
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff0000';
          ctx.fillStyle = '#ff0000';
          // Draw "eyes" near the bottom (facing player)
          ctx.beginPath();
          ctx.arc(ent.x + 8, ent.y + ent.height - 12, 4, 0, Math.PI * 2);
          ctx.arc(ent.x + ent.width - 8, ent.y + ent.height - 12, 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Mouth / Teeth at the bottom
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          const toothWidth = ent.width / 6;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(ent.x + toothWidth * (i + 0.5), ent.y + ent.height - 5);
            ctx.lineTo(ent.x + toothWidth * (i + 1), ent.y + ent.height);
            ctx.lineTo(ent.x + toothWidth * (i + 1.5), ent.y + ent.height - 5);
            ctx.fill();
          }

          // Dark Windshield
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(ent.x + 5, ent.y + 20, ent.width - 10, 10);

          // Scary Picture on Top
          if (scaryImageRef.current) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.drawImage(
              scaryImageRef.current, 
              ent.x + ent.width * 0.2, 
              ent.y + ent.height * 0.3, 
              ent.width * 0.6, 
              ent.height * 0.3
            );
            ctx.restore();
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => drawEntity(obs));

    // Draw Player
    drawEntity(playerRef.current, true);

    // Vignette
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  useEffect(() => {
    if (canvasRef.current) {
      const { width, height } = canvasRef.current;
      initGame(width, height);
      gameStateRef.current.lastTick = 0;
    }
  }, [gameId]);

  const loop = (time: number) => {
    update(time);
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPaused]); // Restart loop if paused state changes

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        gameStateRef.current.keys.Left = true;
        if (e.key.startsWith('Arrow')) e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        gameStateRef.current.keys.Right = true;
        if (e.key.startsWith('Arrow')) e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.keys.Left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.keys.Right = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      gameStateRef.current.touchX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      gameStateRef.current.touchX = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
      gameStateRef.current.touchX = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-none">
      <canvas ref={canvasRef} />
    </div>
  );
}
