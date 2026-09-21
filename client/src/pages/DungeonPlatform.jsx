import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DungeonGame from '../DungeonGame';
import SignalLockGame from '../components/SignalLockGame';
import CipherBreakerGame from '../components/CipherBreakerGame';
import MemoryMatrixGame from '../components/MemoryMatrixGame';
import CircuitOverloadGame from '../components/CircuitOverloadGame';
import NeuralDashGame from '../components/NeuralDashGame';
import { useGameEconomyContext } from '../context/GameEconomyContext';
import { useUser } from '../context/UserContext';
import RechargeOverlay from '../components/RechargeOverlay';
import ToastNotification from '../components/ToastNotification';
import useUiSound from '../hooks/useUiSound';
import { books, getGameName, GAME_NAMES } from '../data/books';

/**
 * DungeonPlatform - Game Selection Interface for Book Purification
 * 
 * This component displays available mini-games and enforces that only the
 * REQUIRED game can unlock a specific corrupted book.
 * 
 * Flow:
 * 1. User navigates from corrupted book -> /dungeon-platform/:bookId
 * 2. Platform looks up book data to find requiredGameId and virusName
 * 3. Mission banner displays virus info and required protocol
 * 4. Only winning the correct game unlocks the book
 * 5. Winning other games awards KP but doesn't unlock
 */

function DungeonPlatform({ onWin, unlockedBooks }) {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [damageFlash, setDamageFlash] = useState(false);

  const { playWin } = useUiSound();

  // 🔥 CONNECT TO USER CONTEXT
  const { user, updateUser } = useUser();

  const {
    kp,
    isLocked,
    timer,
    lockoutProgress,
    canPlay,
    isLoading,
    recordProgress
  } = useGameEconomyContext();

  // 🎯 CRITICAL: Find target book with proper type conversion
  const targetBook = useMemo(() => {
    const foundBook = books.find(b => b.id === parseInt(bookId));
    
    if (!foundBook) {
      console.error(`❌ Book with ID ${bookId} not found in books registry!`);
      return null;
    }
    
    if (!foundBook.requiredGameId || !foundBook.virusName) {
      console.error(`❌ Book "${foundBook.title}" is missing requiredGameId or virusName!`);
    }
    
    console.log(`🎯 Target Book Found:`, {
      id: foundBook.id,
      title: foundBook.title,
      virusName: foundBook.virusName,
      requiredGame: foundBook.requiredGameId
    });
    
    return foundBook;
  }, [bookId]);

  // 🎮 GAME REGISTRY - All available mini-games
  const games = [
    {
      id: 'memory-matrix',
      name: 'Memory Matrix',
      description: 'Replicate complex memory patterns',
      icon: 'fas fa-th',
      difficulty: 'EASY',
      reward: '+30 KP',
      penalty: '-15 KP',
      status: 'active',
      color: '#88dd00'
    },
    {
      id: 'neural-dash',
      name: 'Neural Dash',
      description: 'Navigate data packet through firewall barriers',
      icon: 'fas fa-wind',
      difficulty: 'EASY/MED',
      reward: '+40 KP',
      penalty: '-20 KP',
      status: 'active',
      color: '#00ccff'
    },
    {
      id: 'signal-lock',
      name: 'Signal Lock',
      description: 'Lock moving signals with precision timing',
      icon: 'fas fa-broadcast-tower',
      difficulty: 'MEDIUM',
      reward: '+45 KP',
      penalty: '-20 KP',
      status: 'active',
      color: '#00d4ff'
    },
    {
      id: 'glitch-purge',
      name: 'Glitch Purge',
      description: 'Hunt and eliminate corrupted data fragments',
      icon: 'fas fa-crosshairs',
      difficulty: 'MEDIUM',
      reward: '+50 KP',
      penalty: '-50 KP',
      status: 'active',
      color: '#ff4444'
    },
    {
      id: 'circuit-overload',
      name: 'Circuit Overload',
      description: 'Rotate circuit tiles to connect power flow',
      icon: 'fas fa-microchip',
      difficulty: 'HARD',
      reward: '+60 KP',
      penalty: '-30 KP',
      status: 'active',
      color: '#ff00ff'
    },
    {
      id: 'cipher-breaker',
      name: 'Cipher Breaker',
      description: 'Decode encrypted passwords to unlock access',
      icon: 'fas fa-key',
      difficulty: 'HARD',
      reward: '+75 KP',
      penalty: '-40 KP',
      status: 'active',
      color: '#ff8844'
    }
  ];

  const addToast = (type, title, message, kpAmount = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message, kpAmount }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // 🎯 ENHANCED GAME COMPLETION HANDLER - WITH REPLAY DETECTION
  const handleGameComplete = async (kpAmount, gameId) => {
    setIsPlaying(false);

    const isWin = kpAmount > 0;
    // 🔍 CRITICAL: Safe ID comparison - normalize both to strings
    const isCorrectGame = targetBook && String(gameId) === String(targetBook.requiredGameId);

    // 🎮 CHECK IF BOOK IS ALREADY UNLOCKED (Replay Detection)
    const isAlreadyUnlocked = user?.unlockedBooks?.includes(String(targetBook?.id)) || 
                              user?.unlockedBooks?.includes(Number(targetBook?.id));

    if (isWin) {
      playWin();
      
      // 💰 UPDATE KP IN BOTH CONTEXTS
      const shouldUnlock = isCorrectGame && !isAlreadyUnlocked;
      const progress = await recordProgress(parseInt(bookId), kpAmount, gameId, shouldUnlock);

      if (!progress) {
        addToast('error', 'SAVE FAILED', 'Your progress could not be saved. Please retry.', kpAmount);
        return;
      }

      updateUser({
        kp: progress.knowledgePoints,
        unlockedBooks: progress.unlockedBooks || [],
        completedGames: progress.completedGames || []
      });

      // ✅ FIRST-TIME WIN LOGIC: Only if correct game AND not already unlocked
      if (shouldUnlock) {
        console.log(`🎉 FIRST-TIME UNLOCK! Correct game '${gameId}' completed for book '${targetBook.title}'`);
        
        // 🎊 SHOW SUCCESS MODAL
        addToast('success', '🎉 SYSTEM RESTORED!', `${targetBook.title} has been unlocked!`, kpAmount);
        
        // Call parent handler if provided
        if (onWin) {
          await onWin(parseInt(bookId));
        }

        // ⏱️ REDIRECT TO BOOK DETAILS PAGE
        setTimeout(() => {
          navigate(`/book/${bookId}`, { 
            state: { purgeSuccess: true },
            replace: false 
          });
        }, 1500);
      } 
      // 🔄 REPLAY WIN LOGIC: Correct game but already unlocked
      else if (isCorrectGame && isAlreadyUnlocked) {
        console.log(`🔄 REPLAY WIN - Book ${targetBook.id} already unlocked. KP awarded without notification.`);
        
        // 💚 SHOW MAINTENANCE COMPLETE TOAST (No unlock modal)
        addToast('success', '✅ MAINTENANCE COMPLETE', `System stability improved. +${kpAmount} KP earned!`, kpAmount);
        
        // ⏱️ OPTIONAL: Stay on page or quiet redirect after short delay
        setTimeout(() => {
          navigate(`/book/${bookId}`, { replace: true });
        }, 2000);
      }
      // ⚠️ WRONG GAME - Award KP but don't unlock
      else {
        const requiredGameName = targetBook ? getGameName(targetBook.requiredGameId) : 'UNKNOWN';
        console.log(`⚠️ Wrong game! '${gameId}' won't unlock '${targetBook?.title}'. Required: '${requiredGameName}'`);
        addToast('warning', 'GOOD PRACTICE!', `But ${targetBook?.title} requires ${requiredGameName}!`, kpAmount);
      }
    } else if (kpAmount < 0) {
      // ❌ GAME LOST - Deduct KP with minimum of 0
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 500);
      
      // 💸 DEDUCT KP IN BOTH CONTEXTS
      const progress = await recordProgress(parseInt(bookId), kpAmount, gameId, false);

      if (progress) {
        updateUser({
          kp: progress.knowledgePoints,
          unlockedBooks: progress.unlockedBooks || [],
          completedGames: progress.completedGames || []
        });
      }
      
      addToast('error', 'SYSTEM DAMAGE!', `Protocol failed`, kpAmount);
      console.log(`❌ Game lost! Deducted ${Math.abs(kpAmount)} KP`);
    } else {
      console.log('🚪 Game closed without completion');
    }
  };

  const handleGameSelect = (game) => {
    if (game.status === 'active') {
      if (!canPlay) {
        alert(`Insufficient Knowledge Points! You need at least 50 KP to play. Current: ${kp} KP`);
        return;
      }
      
      setSelectedGame(game);
      setIsPlaying(true);
    }
  };

  const handleExit = () => {
    navigate(`/book/${bookId}`);
  };

  const handleGameClose = () => {
    setIsPlaying(false);
    setSelectedGame(null);
  };

  if (isLocked) {
    return (
      <RechargeOverlay 
        isVisible={isLocked}
        timer={timer}
        progress={lockoutProgress}
      />
    );
  }

  // 🎮 GAME RENDERING - Pass gameId to completion handler
  if (isPlaying && selectedGame?.id === 'glitch-purge') {
    return (
      <DungeonGame 
        bookId={parseInt(bookId)}
        onClose={handleGameClose}
        onWin={(_, result) => {
          updateUser({
            kp: result.knowledgePoints,
            unlockedBooks: result.unlockedBooks || [],
            completedGames: result.completedGames || []
          });
          addToast('success', 'SYSTEM RESTORED!', `${targetBook.title} has been unlocked!`, 50);
          setTimeout(() => navigate(`/book/${bookId}`, {
            state: { purgeSuccess: true },
            replace: false
          }), 1500);
        }}
        onLoss={() => {
          addToast('error', 'SYSTEM DAMAGE!', 'Protocol failed', -50);
        }}
      />
    );
  }

  if (isPlaying && selectedGame?.id === 'signal-lock') {
    return (
      <SignalLockGame 
        onComplete={(kpAmount) => handleGameComplete(kpAmount, 'signal-lock')}
        onClose={handleGameClose}
      />
    );
  }

  if (isPlaying && selectedGame?.id === 'cipher-breaker') {
    return (
      <CipherBreakerGame 
        onComplete={(kpAmount) => handleGameComplete(kpAmount, 'cipher-breaker')}
        onClose={handleGameClose}
      />
    );
  }

  if (isPlaying && selectedGame?.id === 'memory-matrix') {
    return (
      <MemoryMatrixGame 
        onComplete={(kpAmount) => handleGameComplete(kpAmount, 'memory-matrix')}
        onClose={handleGameClose}
      />
    );
  }

  if (isPlaying && selectedGame?.id === 'circuit-overload') {
    return (
      <CircuitOverloadGame 
        onComplete={(kpAmount) => handleGameComplete(kpAmount, 'circuit-overload')}
        onClose={handleGameClose}
      />
    );
  }

  if (isPlaying && selectedGame?.id === 'neural-dash') {
    return (
      <NeuralDashGame 
        onComplete={(kpAmount) => handleGameComplete(kpAmount, 'neural-dash')}
        onClose={handleGameClose}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div className="toast-container">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            kpAmount={toast.kpAmount}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {damageFlash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 0, 0, 0.3)',
          zIndex: 9998,
          animation: 'damageFlash 0.5s ease-out',
          pointerEvents: 'none'
        }} />
      )}

      <div style={styles.header}>
        <button style={styles.backButton} onClick={handleExit}>
          <i className="fas fa-arrow-left"></i>
          <span>Exit Platform</span>
        </button>
        
        <div style={styles.kpDisplay}>
          <div style={styles.kpLabel}>KNOWLEDGE POINTS</div>
          <div style={styles.kpValue}>
            {kp} <span style={styles.kpUnit}>KP</span>
          </div>
          {isLoading && <div style={styles.loadingIndicator}>Updating...</div>}
        </div>
        
        <div style={styles.headerContent}>
          <i className="fas fa-biohazard" style={styles.headerIcon}></i>
          <h1 style={styles.title}>DUNGEON PROTOCOL SELECTION</h1>
          
          {/* 🎯 DYNAMIC MISSION BANNER - FULLY VALIDATED */}
          {targetBook && targetBook.requiredGameId && targetBook.virusName && (
            <div style={styles.missionBanner}>
              <div style={styles.missionLabel}>⚠️ ACTIVE MISSION</div>
              <div style={styles.missionTitle}>
                Neutralize <span style={{color: '#ff4444', fontWeight: 'bold'}}>{targetBook.virusName}</span> in "{targetBook.title}"
              </div>
              <div style={styles.missionRequirement}>
                Required Protocol: <span style={{color: '#ffd700', fontWeight: 'bold', letterSpacing: '1px'}}>{getGameName(targetBook.requiredGameId)}</span>
              </div>
            </div>
          )}

          {/* 🚨 ERROR STATE: Missing book data */}
          {targetBook && (!targetBook.requiredGameId || !targetBook.virusName) && (
            <div style={{...styles.missionBanner, borderColor: '#ff4444', background: 'rgba(255, 68, 68, 0.2)'}}>
              <div style={{...styles.missionLabel, color: '#ff4444'}}>⚠️ DATA CORRUPTION DETECTED</div>
              <div style={styles.missionTitle}>
                Book "{targetBook.title}" is missing required purification data!
              </div>
              <div style={{fontSize: '0.9rem', color: '#ff8888', marginTop: '0.5rem'}}>
                Contact System Administrator
              </div>
            </div>
          )}

          {/* 🚨 ERROR STATE: Book not found */}
          {!targetBook && (
            <div style={{...styles.missionBanner, borderColor: '#ff4444', background: 'rgba(255, 68, 68, 0.2)'}}>
              <div style={{...styles.missionLabel, color: '#ff4444'}}>⚠️ BOOK NOT FOUND</div>
              <div style={styles.missionTitle}>
                Book ID {bookId} does not exist in the library registry!
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.gameGrid}>
        {games.map((game) => {
          // 🎯 Check if this is the required game for the target book
          const isRequiredGame = targetBook && game.id === targetBook.requiredGameId;
          
          return (
            <div
              key={game.id}
              style={{
                ...styles.gameCard,
                borderColor: isRequiredGame ? '#ffd700' : (game.status === 'active' ? game.color : '#333'),
                borderWidth: isRequiredGame ? '3px' : '2px',
                opacity: game.status === 'locked' ? 0.6 : 1,
                cursor: game.status === 'active' ? 'pointer' : 'not-allowed',
                boxShadow: isRequiredGame ? '0 0 30px rgba(255, 215, 0, 0.5)' : 'none',
                transform: isRequiredGame ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => handleGameSelect(game)}
            >
              {/* 🎯 REQUIRED GAME BADGE */}
              {isRequiredGame && (
                <div style={styles.requiredBadge}>
                  <i className="fas fa-star"></i>
                  <span>REQUIRED</span>
                </div>
              )}

              {/* Regular active badge for other games */}
              {!isRequiredGame && game.status === 'active' && (
                <div style={{...styles.activeBadge, backgroundColor: game.color}}>
                  <i className="fas fa-check-circle"></i>
                  <span>ACTIVE</span>
                </div>
              )}

              <div style={{...styles.gameIcon, color: isRequiredGame ? '#ffd700' : game.color}}>
                <i className={game.icon}></i>
              </div>

              <h3 style={styles.gameName}>{game.name}</h3>
              <p style={styles.gameDescription}>{game.description}</p>

              <div style={styles.gameStats}>
                <div style={styles.statItem}>
                  <i className="fas fa-chart-line"></i>
                  <span>{game.difficulty}</span>
                </div>
                <div style={{...styles.statItem, color: '#00ff88'}}>
                  <i className="fas fa-arrow-up"></i>
                  <span>{game.reward}</span>
                </div>
                <div style={{...styles.statItem, color: '#ff4444'}}>
                  <i className="fas fa-arrow-down"></i>
                  <span>{game.penalty}</span>
                </div>
              </div>

              <button style={{
                ...styles.playButton, 
                backgroundColor: isRequiredGame ? '#ffd700' : game.color,
                color: isRequiredGame ? '#000' : '#fff',
                fontWeight: 'bold'
              }}>
                <i className="fas fa-play"></i>
                <span>{isRequiredGame ? 'LAUNCH REQUIRED PROTOCOL' : 'LAUNCH PROTOCOL'}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div style={styles.infoPanel}>
        <div style={styles.infoItem}>
          <i className="fas fa-exclamation-triangle" style={{...styles.infoIcon, color: '#ff4444'}}></i>
          <div>
            <strong>⚠️ MISSION CRITICAL:</strong>
            <p>Only the REQUIRED protocol will unlock corrupted books. Other games award KP for practice!</p>
          </div>
        </div>
        <div style={styles.infoItem}>
          <i className="fas fa-trophy" style={styles.infoIcon}></i>
          <div>
            <strong>Risk vs. Reward:</strong>
            <p>Higher difficulty = Greater rewards but harsher penalties. Choose wisely!</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes damageFlash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes gradient {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '2rem',
    color: '#fff',
    fontFamily: "'Courier New', monospace"
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem',
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    transition: 'all 0.3s ease'
  },
  kpDisplay: {
    position: 'absolute',
    top: 0,
    right: 0,
    background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0, 200, 50, 0.2))',
    border: '2px solid #00ff41',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    textAlign: 'center',
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
  },
  kpLabel: {
    fontSize: '0.7rem',
    letterSpacing: '2px',
    color: '#00ff41',
    marginBottom: '0.25rem',
    opacity: 0.8,
  },
  kpValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#00ff41',
    textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
  },
  kpUnit: {
    fontSize: '1rem',
    opacity: 0.7,
  },
  loadingIndicator: {
    fontSize: '0.7rem',
    color: '#ffaa00',
    marginTop: '0.25rem',
    animation: 'pulse 1s infinite',
  },
  headerContent: {
    paddingTop: '1rem'
  },
  headerIcon: {
    fontSize: '4rem',
    color: '#ff4444',
    marginBottom: '1rem',
    filter: 'drop-shadow(0 0 20px rgba(255, 68, 68, 0.5))',
    animation: 'pulse 2s infinite'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #ff4444, #ff8844, #ff4444)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto',
    animation: 'gradient 3s linear infinite'
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    margin: '0 auto 3rem'
  },
  gameCard: {
    background: 'rgba(20, 20, 30, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '2px solid',
    borderRadius: '16px',
    padding: '2rem',
    position: 'relative',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center'
  },
  activeBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#fff',
    fontWeight: 'bold'
  },
  gameIcon: {
    fontSize: '4rem',
    marginBottom: '1.5rem',
    filter: 'drop-shadow(0 0 10px currentColor)'
  },
  gameName: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    textTransform: 'uppercase'
  },
  gameDescription: {
    color: '#aaa',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    lineHeight: '1.5'
  },
  gameStats: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '1.5rem',
    width: '100%',
    justifyContent: 'center'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#ccc',
    fontSize: '0.9rem'
  },
  playButton: {
    width: '100%',
    padding: '1rem',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  infoPanel: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'rgba(108, 92, 231, 0.1)',
    border: '1px solid rgba(108, 92, 231, 0.3)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  infoItem: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  infoIcon: {
    fontSize: '1.5rem',
    color: '#6c5ce7',
    marginTop: '0.25rem'
  },
  // 🎯 MISSION BANNER STYLES
  missionBanner: {
    background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 136, 68, 0.2))',
    border: '2px solid rgba(255, 215, 0, 0.5)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1.5rem',
    maxWidth: '800px',
    margin: '1.5rem auto 0',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
    animation: 'pulse 2s infinite'
  },
  missionLabel: {
    fontSize: '0.8rem',
    letterSpacing: '2px',
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    textTransform: 'uppercase'
  },
  missionTitle: {
    fontSize: '1.3rem',
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    lineHeight: '1.4'
  },
  missionRequirement: {
    fontSize: '1rem',
    color: '#aaa',
    marginTop: '0.5rem'
  },
  // 🎯 REQUIRED BADGE STYLE
  requiredBadge: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#000',
    fontWeight: 'bold',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
    animation: 'pulse 1.5s infinite'
  }
};

export default DungeonPlatform;
