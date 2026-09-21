import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useGameEconomy - Professional-grade React hook for game economy management
 * 
 * Features:
 * - Real-time KP tracking
 * - Automatic lockout detection and timer
 * - Energy restoration with sound effects
 * - LOSING COUNTDOWN SOUND at 5 seconds (count.mp3)
 * - API integration with error handling
 * - Optimistic UI updates
 * 
 * @param {number} userId - The player's ID
 * @param {number} initialKP - Initial KP value (default: 100)
 * @returns {Object} Game economy state and methods
 */
const useGameEconomy = (userId, initialKP = 100) => {
  // State management
  const [kp, setKp] = useState(initialKP);
  const [isLocked, setIsLocked] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for cleanup and audio
  const timerIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const countdownAudioRef = useRef(null); // 🎵 NEW: For losing countdown sound
  const countdownSoundPlayed = useRef(false); // 🎵 NEW: Track if countdown sound played
  const hasInitialized = useRef(false);

  const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/players`;
  const LOCKOUT_DURATION = 10; // 10 seconds

  /**
   * Initialize audio references
   */
  useEffect(() => {
    audioRef.current = new Audio('/sounds/power-up.mp3');
    audioRef.current.volume = 0.5;

    // 🎵 NEW: Initialize losing countdown sound (same as restoring)
    countdownAudioRef.current = new Audio('/sounds/count.mp3');
    countdownAudioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current = null;
      }
    };
  }, []);

  /**
   * Cleanup timer on unmount
   */
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  /**
   * Play power-up sound effect
   */
  const playPowerUpSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });
    }
  }, []);

  /**
   * 🎵 NEW: Play losing countdown sound effect
   */
  const playCountdownSound = useCallback(() => {
    // Check if audio is muted
    const isMuted = localStorage.getItem('audioMuted') === 'true' || 
                    (window.getAudioMuted && window.getAudioMuted());
    
    if (isMuted) {
      console.log('🔇 Countdown sound muted');
      return;
    }

    if (countdownAudioRef.current) {
      countdownAudioRef.current.currentTime = 0;
      countdownAudioRef.current.play()
        .then(() => console.log('⏱️ Losing countdown sound played at 5 seconds'))
        .catch(err => {
          console.warn('Countdown audio playback failed:', err);
        });
    }
  }, []);

  /**
   * Restore energy after lockout (called automatically by timer)
   */
  const restoreEnergy = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE}/${userId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to restore energy');
      }

      const data = await response.json();

      // Update state
      setKp(data.knowledgePoints);
      setIsLocked(false);
      setTimer(0);

      // Play power-up sound
      playPowerUpSound();

      console.log('✅ Energy restored:', data.message);
    } catch (err) {
      console.error('Error restoring energy:', err);
      setError(err.message);
    }
  }, [userId, playPowerUpSound]);

  /**
   * Start the 10-second lockout timer
   * 🎵 NOW PLAYS COUNTDOWN SOUND AT 5 SECONDS REMAINING
   */
  const startLockoutTimer = useCallback(() => {
    console.log('🔒 LOCKOUT TRIGGERED - Starting 10-second timer');
    setIsLocked(true);
    setTimer(LOCKOUT_DURATION);
    countdownSoundPlayed.current = false; // 🎵 Reset countdown sound tracker

    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Start countdown
    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => {
        // 🎵 Play countdown sound at 5 seconds remaining
        if (prev === 5 && !countdownSoundPlayed.current) {
          console.log('⏰ 5 seconds remaining - playing losing countdown sound');
          playCountdownSound();
          countdownSoundPlayed.current = true;
        }

        if (prev <= 1) {
          // Timer complete - trigger restoration
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          countdownSoundPlayed.current = false; // Reset for next time
          restoreEnergy();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playCountdownSound, restoreEnergy]);

  /**
   * API Call: Update KP (generic method)
   */
  const updateKP = useCallback(async (amount) => {
    if (!userId) {
      setError('User ID is required');
      console.error('❌ No user ID provided');
      return null;
    }

    // Use functional update to get current KP without depending on it
    let currentKP = 0;
    setKp(prev => {
      currentKP = prev;
      return prev;
    });

    console.log(`📊 Updating KP: ${amount > 0 ? '+' : ''}${amount} (Current: ${currentKP} KP)`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${userId}/kp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update KP: ${errorText}`);
      }

      const data = await response.json();
      
      console.log('✅ Backend response:', data);
      
      // Update local state IMMEDIATELY
      setKp(data.knowledgePoints);

      // Check for lockout
      if (data.isLocked && data.knowledgePoints === 0) {
        console.log('⚠️ KP is 0 - Triggering lockout');
        startLockoutTimer();
      }

      console.log(`✅ KP updated successfully: ${data.knowledgePoints} KP`);
      return data;
    } catch (err) {
      console.error('❌ Error updating KP:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, startLockoutTimer]); // ✅ REMOVED 'kp' from dependencies

  /**
   * Handle game victory - Award +50 KP
   */
  const handleWin = useCallback(async () => {
    console.log('🎉 WIN - Awarding +50 KP');
    return await updateKP(50);
  }, [updateKP]);

  /**
   * Handle game defeat - Deduct 50 KP
   * CRITICAL: This ensures immediate deduction
   */
  const handleLoss = useCallback(async () => {
    console.log('💔 LOSS - Deducting -50 KP');
    return await updateKP(-50);
  }, [updateKP]);

  /**
   * 📚 NEW: Complete a dungeon level - Awards KP and unlocks book
   * This replaces handleWin/handleLoss for book-specific gameplay
   * 
   * @param {number} bookId - The book ID being played
   * @param {boolean} isWin - Whether the player won or lost
   * @returns {Object} Response containing: newKp, unlockedBookIds, firstTimeUnlock
   */
  const completeLevel = useCallback(async (bookId, isWin) => {
    if (!userId) {
      setError('User ID is required');
      console.error('❌ No user ID provided');
      return null;
    }

    console.log(`📚 Completing level for book ${bookId} - Result: ${isWin ? 'WIN' : 'LOSS'}`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${userId}/complete-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, isWin })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to complete level: ${errorText}`);
      }

      const data = await response.json();
      
      console.log('✅ Level completed:', data);
      
      // Update local state IMMEDIATELY
      setKp(data.newKp);

      // Check for lockout
      if (data.isLocked && data.newKp === 0) {
        console.log('⚠️ KP is 0 - Triggering lockout');
        startLockoutTimer();
      }

      // Log unlock status
      if (data.firstTimeUnlock) {
        console.log('🎉 FIRST TIME UNLOCK! Book added to collection');
      }

      return data;
    } catch (err) {
      console.error('❌ Error completing level:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, startLockoutTimer]);

  const recordProgress = useCallback(async (bookId, kpAmount, gameId, unlockBook) => {
    if (!userId) {
      setError('User ID is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${userId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, kpAmount, gameId, unlockBook })
      });

      if (!response.ok) {
        throw new Error(`Failed to save progress: HTTP ${response.status}`);
      }

      const data = await response.json();
      setKp(data.knowledgePoints);

      if (data.isLocked && data.knowledgePoints === 0) {
        startLockoutTimer();
      }

      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, startLockoutTimer]);

  /**
   * Fetch current player status from backend
   * FIXED: Removed from useCallback to break circular dependency
   */
  const refreshKP = async () => {
    if (!userId) {
      console.log('⚠️ No userId provided to refreshKP');
      return;
    }

    console.log('🔄 Refreshing KP from backend for user:', userId);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch player data');
      }

      const data = await response.json();
      console.log('📥 Player data fetched:', data);
      setKp(data.knowledgePoints);

      // Check if locked
      if (data.knowledgePoints === 0) {
        // Player might be locked - check lockout status
        const statusResponse = await fetch(`${API_BASE}/${userId}/can-play`);
        const statusData = await statusResponse.json();
        
        if (statusData.lockoutSeconds > 0) {
          setTimer(statusData.lockoutSeconds);
          setIsLocked(true);
        }
      }
    } catch (err) {
      console.error('❌ Error refreshing KP:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize hook - fetch current KP on mount and when userId changes
   */
  useEffect(() => {
    if (userId && !hasInitialized.current) {
      console.log('🎮 Initializing Game Economy for user:', userId);
      hasInitialized.current = true;
      refreshKP();
    } else if (!userId && hasInitialized.current) {
      // Reset when user logs out
      hasInitialized.current = false;
      setKp(initialKP);
    }
  }, [userId]);

  return {
    // State
    kp,
    isLocked,
    timer,
    isLoading,
    error,

    // Methods
    handleWin,
    handleLoss,
    completeLevel, // 📚 NEW: Complete level with book unlock tracking
    recordProgress,
    updateKP,
    refreshKP,
    restoreEnergy,

    // Computed values
    canPlay: kp >= 50 && !isLocked,
    lockoutProgress: timer > 0 ? ((LOCKOUT_DURATION - timer) / LOCKOUT_DURATION) * 100 : 0,
  };
};

export default useGameEconomy;
