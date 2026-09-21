import { useState, useEffect, useCallback } from 'react';

/**
 * useDailyReward Hook
 * Manages 24-hour Daily Supply Drop system
 * 
 * Features:
 * - Checks if reward is ready to claim
 * - Provides real-time countdown timer
 * - Handles reward claiming with API integration
 * - Auto-updates every second
 * 
 * @param {number} userId - The player's user ID
 * @returns {Object} - { isReady, timeLeft, collectReward, isLoading, error, rewardAmount, nextClaimTime }
 */
const useDailyReward = (userId) => {
  const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/players`;
  const [isReady, setIsReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState('--:--:--');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rewardAmount, setRewardAmount] = useState(100);
  const [nextClaimTime, setNextClaimTime] = useState(null);
  const [lastClaimed, setLastClaimed] = useState(null);

  /**
   * Fetch daily reward status from backend
   */
  const fetchRewardStatus = useCallback(async () => {
    if (!userId) {
      console.warn('⚠️ useDailyReward: No userId provided');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${userId}/daily-reward/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch daily reward status`);
      }

      const data = await response.json();

      setIsReady(data.isReady);
      setRemainingSeconds(data.remainingSeconds || 0);
      setRewardAmount(data.rewardAmount || 100);
      setNextClaimTime(data.nextClaimTime);
      setLastClaimed(data.lastClaimed);

    } catch (err) {
      console.error('❌ Error fetching daily reward status:', err);
      setError(err.message);
    }
  }, [userId]);

  /**
   * Claim daily reward (+100 KP)
   */
  const collectReward = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      return false;
    }

    if (!isReady) {
      setError('Reward is not ready yet. Please wait for cooldown to expire.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${userId}/daily-reward/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          // Too Many Requests - Cooldown active
          throw new Error(errorData.message || 'Daily reward is on cooldown');
        }
        
        throw new Error(errorData.error || 'Failed to claim reward');
      }

      const data = await response.json();

      console.log('🎁 Daily reward claimed successfully:', data);

      // Update state
      setIsReady(false);
      setNextClaimTime(data.nextClaimTime);
      setRemainingSeconds(24 * 60 * 60); // Reset to 24 hours

      // Refresh status
      await fetchRewardStatus();

      return true;

    } catch (err) {
      console.error('❌ Error claiming daily reward:', err);
      setError(err.message);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [userId, isReady, fetchRewardStatus]);

  /**
   * Format seconds into HH:MM:SS
   */
  const formatTime = useCallback((seconds) => {
    if (seconds <= 0) return '00:00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  /**
   * Initialize - Fetch status on mount and when userId changes
   */
  useEffect(() => {
    fetchRewardStatus();
  }, [fetchRewardStatus]);

  /**
   * Real-time countdown timer
   * Updates every second
   */
  useEffect(() => {
    if (isReady) {
      setTimeLeft('READY');
      return;
    }

    if (remainingSeconds <= 0) {
      setTimeLeft('00:00:00');
      setIsReady(true);
      return;
    }

    // Update time left display
    setTimeLeft(formatTime(remainingSeconds));

    // Countdown timer
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newSeconds = prev - 1;

        if (newSeconds <= 0) {
          setIsReady(true);
          setTimeLeft('READY');
          fetchRewardStatus(); // Refresh status when timer reaches 0
          return 0;
        }

        setTimeLeft(formatTime(newSeconds));
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, remainingSeconds, formatTime, fetchRewardStatus]);

  return {
    isReady,
    timeLeft,
    collectReward,
    isLoading,
    error,
    rewardAmount,
    nextClaimTime,
    lastClaimed,
    refreshStatus: fetchRewardStatus,
  };
};

export default useDailyReward;
