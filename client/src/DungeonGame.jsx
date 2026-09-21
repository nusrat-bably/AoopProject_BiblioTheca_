import { useState, useEffect, useRef } from 'react';
import { useGameEconomyContext } from './context/GameEconomyContext';
import RechargeOverlay from './components/RechargeOverlay';
import useUiSound from './hooks/useUiSound';

function DungeonGame({ onWin, onLoss, onClose, bookId }) {
  // 🎮 USE SHARED GAME ECONOMY CONTEXT
  const {
    kp,
    isLocked,
    timer,
    lockoutProgress,
    recordProgress,
    isLoading,
    error
  } = useGameEconomyContext();

  // 🎵 USE UI SOUND HOOK - ENHANCED WITH WIN SOUND
  const { playClick, playPowerUp, playCountdown, playWin, stopCountdown } = useUiSound();

  // Game state
  const [timeLeft, setTimeLeft] = useState(10);
  const [clicks, setClicks] = useState(0);
  const [glitchPosition, setGlitchPosition] = useState({ x: 50, y: 50 });
  const [gameState, setGameState] = useState('playing');
  const [showGlitch, setShowGlitch] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [rewardProcessed, setRewardProcessed] = useState(false); // ✅ Track if reward/penalty processed
  const gameRef = useRef(null);
  const countdownSoundsPlayed = useRef({ 5: false, 4: false, 3: false, 2: false, 1: false });
  const timerRef = useRef(null); // ✅ FIX: Store timer reference for proper cleanup
  const hasProcessedCurrentGame = useRef(false); // ✅ FIX: Prevent duplicate processing

  const CLICKS_TO_WIN = 5;
  const GAME_DURATION = 10;

  // ✅ FIX: Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Timer countdown with countdown sounds at 5,4,3,2,1 seconds
  useEffect(() => {
    // ✅ FIX: Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only run timer when game is actively playing
    if (gameState !== 'playing') {
      // ✅ CRITICAL: Stop countdown sound when game ends
      stopCountdown();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // 🔊 PLAY COUNTDOWN SOUND AT 5, 4, 3, 2, 1 SECONDS
        if ([5, 4, 3, 2, 1].includes(prev) && !countdownSoundsPlayed.current[prev]) {
          console.log(`⏱️ Playing countdown sound at ${prev} seconds!`);
          playCountdown();
          countdownSoundsPlayed.current[prev] = true;
        }

        if (prev <= 1) {
          setGameState('lost');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // ✅ FIX: Cleanup timer when effect re-runs or component unmounts
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // ✅ CRITICAL: Stop sound on cleanup
      stopCountdown();
    };
  }, [gameState, playCountdown, stopCountdown]);

  // Check win condition with celebration
  useEffect(() => {
    if (clicks >= CLICKS_TO_WIN && gameState === 'playing') {
      setGameState('won');
      // ✅ FIX: Stop timer immediately on win
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // ✅ CRITICAL FIX: STOP COUNTDOWN SOUND IMMEDIATELY ON WIN
      stopCountdown();
      // 🎉 PLAY WIN SOUND IMMEDIATELY ON VICTORY
      playWin();
      // Trigger confetti animation
      setShowCongrats(true);
      setTimeout(() => setShowCongrats(false), 3000);
    }
  }, [clicks, gameState, playWin, stopCountdown]);

  // ✅ AUTO-PROCESS REWARD/PENALTY WHEN GAME ENDS (ONLY ONCE)
  useEffect(() => {
    // ✅ FIX: Check both flags to prevent duplicate processing
    if (hasProcessedCurrentGame.current || rewardProcessed || isLoading) return;
    if (gameState !== 'won' && gameState !== 'lost') return;

    const processGameEnd = async () => {
      // ✅ FIX: Mark as processed IMMEDIATELY to prevent race conditions
      hasProcessedCurrentGame.current = true;
      setRewardProcessed(true);

      if (gameState === 'won') {
        console.log('🎯 Auto-processing win reward: +50 KP (FIRST TIME ONLY)');
        try {
          const result = await recordProgress(bookId, 50, 'glitch-purge', true);
          if (result) {
            console.log('✅ Win processed:', result);
            onWin?.(bookId, result);
          }
        } catch (err) {
          console.error('Error processing win:', err);
          // Reset on error to allow retry
          hasProcessedCurrentGame.current = false;
          setRewardProcessed(false);
        }
      } else if (gameState === 'lost') {
        console.log('💀 Auto-processing loss penalty: -50 KP (FIRST TIME ONLY)');
        try {
          const result = await recordProgress(bookId, -50, 'glitch-purge', false);
          if (result) {
            console.log('✅ Loss processed:', result);
            onLoss?.(bookId, result);
          }
        } catch (err) {
          console.error('Error processing loss:', err);
          // Reset on error to allow retry
          hasProcessedCurrentGame.current = false;
          setRewardProcessed(false);
        }
      }
    };

    processGameEnd();
  }, [gameState, bookId, recordProgress, rewardProcessed, isLoading, onWin, onLoss]);

  // Move glitch to random position
  const moveGlitch = () => {
    if (gameRef.current) {
      const maxX = 85;
      const maxY = 85;
      const newX = Math.random() * maxX;
      const newY = Math.random() * maxY;
      
      setGlitchPosition({ x: newX, y: newY });
      setShowGlitch(false);
      
      setTimeout(() => setShowGlitch(true), 100);
    }
  };

  const handleGlitchClick = () => {
    if (gameState !== 'playing') return;
    
    playClick(); // 🔊 PLAY CLICK SOUND
    setClicks(prev => prev + 1);
    moveGlitch();
    
    // Visual feedback
    const glitchEl = document.querySelector('.glitch-box');
    if (glitchEl) {
      glitchEl.style.transform = 'scale(1.2)';
      setTimeout(() => {
        glitchEl.style.transform = 'scale(1)';
      }, 100);
    }
  };

  const handlePlayAgain = () => {
    // ✅ FIX: Clear timer before resetting
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset game state
    setTimeLeft(GAME_DURATION);
    setClicks(0);
    setGameState('playing');
    setShowGlitch(true);
    setShowCongrats(false);
    setRewardProcessed(false);
    hasProcessedCurrentGame.current = false; // ✅ FIX: Reset processing flag
    countdownSoundsPlayed.current = { 5: false, 4: false, 3: false, 2: false, 1: false };
    
    // Reset glitch position
    setGlitchPosition({ x: 50, y: 50 });
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const progress = (clicks / CLICKS_TO_WIN) * 100;

  return (
    <div style={styles.overlay} ref={gameRef}>
      <div style={styles.container}>
        
        {/* 🎉 MODERN CONGRATULATIONS ANIMATION */}
        {showCongrats && (
          <div style={styles.congratsOverlay}>
            <div style={styles.congratsContent}>
              <div style={styles.congratsEmoji}>🎉</div>
              <div style={styles.congratsText}>CONGRATULATIONS!</div>
              <div style={styles.congratsSubtext}>Mission Complete</div>
            </div>
            {/* Confetti particles */}
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.confetti,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  background: ['#00ff41', '#ff4444', '#ffff00', '#00ddff', '#ff44ff'][i % 5],
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.glitchText}>
            ⚠️ CORRUPTION DETECTED ⚠️
          </div>
          <div style={styles.subtitle}>
            PURGE THE SYSTEM TO ESCAPE
          </div>
          
          {/* 📊 KP Display */}
          <div style={styles.kpBadge}>
            <div style={styles.kpLabel}>KP</div>
            <div style={styles.kpValue}>{kp}</div>
            {isLoading && <div style={styles.kpLoading}>↻</div>}
          </div>
        </div>

        {/* Game State: Playing */}
        {gameState === 'playing' && (
          <>
            {/* Stats Bar */}
            <div style={styles.statsBar}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>SYSTEM PURGE:</span>
                <span style={styles.statValue}>{progress.toFixed(0)}%</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>TIME:</span>
                <span style={{...styles.statValue, color: timeLeft <= 5 ? '#ff4444' : '#00ff41'}}>
                  {timeLeft}s
                </span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>TARGETS:</span>
                <span style={styles.statValue}>{clicks}/{CLICKS_TO_WIN}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
              <div style={{...styles.progressBar, width: `${progress}%`}}>
                <div style={styles.progressGlow}></div>
              </div>
            </div>

            {/* Instructions */}
            <div style={styles.instructions}>
              &gt; CLICK THE GLITCH TO NEUTRALIZE IT
              <br />
              &gt; {CLICKS_TO_WIN - clicks} PURGES REMAINING
            </div>

            {/* Game Area */}
            <div style={styles.gameArea}>
              {showGlitch && (
                <div
                  className="glitch-box"
                  style={{
                    ...styles.glitchBox,
                    left: `${glitchPosition.x}%`,
                    top: `${glitchPosition.y}%`,
                  }}
                  onClick={handleGlitchClick}
                >
                  <div style={styles.glitchCore}>⚡</div>
                  <div style={styles.glitchLabel}>PURGE</div>
                </div>
              )}
              
              {/* Scanlines effect */}
              <div style={styles.scanlines}></div>
            </div>
          </>
        )}

        {/* Game State: Won */}
        {gameState === 'won' && (
          <div style={styles.endScreen}>
            <div style={styles.endIcon}>✓</div>
            <div style={styles.endTitle}>SYSTEM RESTORED</div>
            <div style={styles.endMessage}>
              &gt; CORRUPTION PURGED: 100%
              <br />
              &gt; NEURAL PATHWAY STABILIZED
              <br />
              &gt; REWARD AUTOMATICALLY AWARDED
            </div>
            <div style={styles.rewardBox}>
              <div style={styles.rewardLabel}>
                {isLoading ? 'PROCESSING REWARD...' : rewardProcessed ? 'REWARD CLAIMED' : 'PROCESSING...'}
              </div>
              <div style={styles.rewardValue}>+50 KP</div>
              {rewardProcessed && <div style={styles.checkmark}>✓</div>}
            </div>
            
            <div style={styles.buttonGroup}>
              <button 
                style={styles.playAgainButton} 
                onClick={handlePlayAgain}
                disabled={isLoading}
              >
                [ PLAY AGAIN ]
              </button>
              
              <button 
                style={styles.exitButton} 
                onClick={handleClose}
              >
                [ EXIT ]
              </button>
            </div>
            
            {error && (
              <div style={styles.errorMessage}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Game State: Lost */}
        {gameState === 'lost' && (
          <div style={styles.endScreen}>
            <div style={{...styles.endIcon, color: '#ff4444'}}>✗</div>
            <div style={{...styles.endTitle, color: '#ff4444'}}>CONNECTION FAILED</div>
            <div style={styles.endMessage}>
              &gt; SYSTEM PURGE INCOMPLETE: {progress.toFixed(0)}%
              <br />
              &gt; NEURAL PATHWAY COLLapsed
              <br />
              &gt; PENALTY AUTOMATICALLY APPLIED
            </div>
            <div style={{...styles.rewardBox, borderColor: '#ff4444', background: 'rgba(255, 68, 68, 0.1)'}}>
              <div style={{...styles.rewardLabel, color: '#ff4444'}}>
                {isLoading ? 'PROCESSING PENALTY...' : rewardProcessed ? 'PENALTY APPLIED' : 'PROCESSING...'}
              </div>
              <div style={{...styles.rewardValue, color: '#ff4444'}}>-50 KP</div>
              {rewardProcessed && <div style={{...styles.checkmark, color: '#ff4444'}}>✓</div>}
            </div>
            
            <div style={styles.buttonGroup}>
              <button 
                style={styles.playAgainButton} 
                onClick={handlePlayAgain}
                disabled={isLoading}
              >
                [ PLAY AGAIN ]
              </button>
              
              <button 
                style={styles.exitButton} 
                onClick={handleClose}
              >
                [ EXIT ]
              </button>
            </div>
            
            {error && (
              <div style={styles.errorMessage}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// Styles object
const styles = {
  // ...existing styles...
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '"Courier New", monospace',
    color: '#00ff41',
  },
  container: {
    width: '90%',
    maxWidth: '900px',
    height: '90%',
    maxHeight: '700px',
    background: 'rgba(0, 20, 0, 0.9)',
    border: '2px solid #00ff41',
    borderRadius: '10px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0 40px rgba(0, 255, 65, 0.3), inset 0 0 40px rgba(0, 255, 65, 0.1)',
    position: 'relative',
  },
  // 🎉 MODERN CONGRATULATIONS OVERLAY
  congratsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(5px)',
    animation: 'fadeInOut 3s ease-in-out',
    borderRadius: '10px',
  },
  congratsContent: {
    textAlign: 'center',
    animation: 'scaleIn 0.5s ease-out',
  },
  congratsEmoji: {
    fontSize: '100px',
    marginBottom: '20px',
    animation: 'bounce 0.6s ease-in-out infinite',
  },
  congratsText: {
    fontSize: '48px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #00ff41, #ffff00, #00ddff, #ff44ff, #00ff41)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '4px',
    animation: 'rainbowText 2s linear infinite',
    textShadow: '0 0 30px rgba(0, 255, 65, 0.5)',
  },
  congratsSubtext: {
    fontSize: '20px',
    color: '#00ff41',
    marginTop: '10px',
    letterSpacing: '2px',
    opacity: 0.9,
  },
  confetti: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    opacity: 0,
    animation: 'confettiFall 3s ease-out forwards',
  },
  // 📚 BOOK UNLOCKED TOAST
  unlockToast: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 255, 65, 0.1)',
    border: '2px solid #00ff41',
    borderRadius: '8px',
    padding: '15px 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)',
    zIndex: 200,
    animation: 'fadeInOut 3s ease-in-out',
  },
  unlockIcon: {
    fontSize: '32px',
    textShadow: '0 0 10px #00ff41',
  },
  unlockContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  unlockTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00ff41',
    textShadow: '0 0 10px #00ff41',
  },
  unlockSubtext: {
    fontSize: '14px',
    color: '#00ff41',
    opacity: 0.8,
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #00ff41',
    paddingBottom: '15px',
    position: 'relative',
  },
  glitchText: {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    textShadow: '0 0 10px #00ff41, 0 0 20px #00ff41',
    animation: 'glitch 0.5s infinite',
  },
  subtitle: {
    fontSize: '14px',
    marginTop: '10px',
    opacity: 0.8,
    letterSpacing: '2px',
  },
  kpBadge: {
    position: 'absolute',
    top: '0',
    right: '0',
    background: 'rgba(0, 255, 65, 0.2)',
    border: '2px solid #00ff41',
    borderRadius: '8px',
    padding: '8px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 0 15px rgba(0, 255, 65, 0.3)',
  },
  kpLabel: {
    fontSize: '10px',
    opacity: 0.7,
    letterSpacing: '1px',
  },
  kpValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    textShadow: '0 0 5px #00ff41',
  },
  kpLoading: {
    fontSize: '16px',
    animation: 'spin 1s linear infinite',
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '15px',
    padding: '15px',
    background: 'rgba(0, 255, 65, 0.05)',
    border: '1px solid rgba(0, 255, 65, 0.3)',
    borderRadius: '5px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  statLabel: {
    fontSize: '11px',
    opacity: 0.6,
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 0 5px currentColor',
  },
  progressContainer: {
    width: '100%',
    height: '20px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid #00ff41',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '20px',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff41, #00cc33)',
    transition: 'width 0.3s ease',
    position: 'relative',
    boxShadow: '0 0 10px #00ff41',
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
    animation: 'shimmer 2s infinite',
  },
  instructions: {
    textAlign: 'center',
    fontSize: '14px',
    marginBottom: '20px',
    padding: '10px',
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px dashed rgba(255, 68, 68, 0.5)',
    borderRadius: '5px',
    color: '#ff4444',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(0, 255, 65, 0.3)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  glitchBox: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #ff0000, #cc0000)',
    border: '3px solid #ffff00',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'transform 0.1s ease',
    boxShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.5)',
    animation: 'pulse 1s infinite',
    zIndex: 10,
  },
  glitchCore: {
    fontSize: '32px',
    textShadow: '0 0 10px #ffff00',
  },
  glitchLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#ffff00',
    letterSpacing: '1px',
    marginTop: '5px',
  },
  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'repeating-linear-gradient(0deg, rgba(0, 255, 65, 0.05) 0px, transparent 2px)',
    pointerEvents: 'none',
    animation: 'scan 8s linear infinite',
  },
  endScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    gap: '25px',
  },
  endIcon: {
    fontSize: '80px',
    textShadow: '0 0 20px currentColor',
    animation: 'fadeIn 0.5s ease',
  },
  endTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    textShadow: '0 0 10px currentColor',
  },
  endMessage: {
    fontSize: '14px',
    lineHeight: '1.8',
    opacity: 0.9,
    maxWidth: '500px',
  },
  rewardBox: {
    padding: '20px 40px',
    background: 'rgba(0, 255, 65, 0.1)',
    border: '2px solid #00ff41',
    borderRadius: '10px',
    marginTop: '10px',
    position: 'relative',
    minWidth: '250px',
  },
  rewardLabel: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    textShadow: '0 0 10px currentColor',
  },
  checkmark: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    fontSize: '24px',
    color: '#00ff41',
    textShadow: '0 0 10px currentColor',
    animation: 'scaleIn 0.3s ease-out',
  },
  playAgainButton: {
    padding: '15px 30px',
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    background: 'rgba(0, 255, 65, 0.2)',
    color: '#00ff41',
    border: '2px solid #00ff41',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    letterSpacing: '2px',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
    whiteSpace: 'nowrap',
  },
  exitButton: {
    padding: '15px 30px',
    fontSize: '14px',
    fontFamily: '"Courier New", monospace',
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#00ff41',
    border: '2px solid rgba(0, 255, 65, 0.5)',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    letterSpacing: '2px',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  errorMessage: {
    marginTop: '15px',
    padding: '10px 20px',
    background: 'rgba(255, 68, 68, 0.2)',
    border: '1px solid #ff4444',
    borderRadius: '5px',
    color: '#ff4444',
    fontSize: '12px',
  },
};

// Add CSS animations via a style tag (injected once)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes glitch {
      0%, 100% { text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41; }
      50% { text-shadow: -2px 0 10px #ff0000, 2px 0 20px #00ff41; }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); }
      50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(255, 0, 0, 1); }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes scan {
      0% { transform: translateY(0); }
      100% { transform: translateY(100%); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeInOut {
      0% { opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    @keyframes rainbowText {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }
    @keyframes confettiFall {
      0% { 
        opacity: 1;
        transform: translateY(-50px) rotate(0deg);
      }
      100% { 
        opacity: 0;
        transform: translateY(600px) rotate(720deg);
      }
    }
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 0 30px currentColor !important;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;
  if (!document.querySelector('#dungeon-game-styles')) {
    styleSheet.id = 'dungeon-game-styles';
    document.head.appendChild(styleSheet);
  }
}

export default DungeonGame;
