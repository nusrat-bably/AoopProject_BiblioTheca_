package com.bibliotheca.service;

import com.bibliotheca.model.Player;
import com.bibliotheca.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * PlayerService - Professional-grade service layer for Player economy management
 * Handles all Knowledge Points (KP) transactions with ACID compliance
 * 
 * Game Rules:
 * - Initial KP: 100
 * - Win: +50 KP
 * - Loss: -50 KP (clamped to 0 minimum)
 * - Lockout: Triggered at 0 KP for 10 seconds
 * - Restoration: Sets KP to 50 after lockout
 */
@Service
public class PlayerService {

    @Autowired
    private PlayerRepository playerRepository;

    private static final int WIN_REWARD = 50;
    private static final int LOSS_PENALTY = 50;
    private static final int RESTORED_KP = 50;
    private static final int LOCKOUT_DURATION_SECONDS = 10;

    /**
     * Update player's Knowledge Points with transaction safety
     * Implements the Mercy Rule: KP cannot drop below 0
     * 
     * @param userId The player's ID
     * @param amount The amount to add (positive) or deduct (negative)
     * @return Updated Player entity
     * @throws RuntimeException if player not found
     */
    @Transactional
    public Player updateKP(Long userId, int amount) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        // Fetch current KP and apply change
        int currentKP = player.getKnowledgePoints();
        int newKP = currentKP + amount;

        // MERCY RULE: Clamp to 0 minimum (never go negative)
        newKP = Math.max(0, newKP);

        // Update KP
        player.setKnowledgePoints(newKP);

        // If KP hits 0, start lockout timer
        if (newKP == 0) {
            player.setLastRegenerationTime(LocalDateTime.now());
        }

        // CRITICAL: Explicit save to ensure immediate persistence
        return playerRepository.save(player);
    }

    /**
     * Handle player victory - Award +50 KP
     * 
     * @param userId The player's ID
     * @return Updated Player entity
     */
    @Transactional
    public Player handleWin(Long userId) {
        return updateKP(userId, WIN_REWARD);
    }

    /**
     * Handle player defeat - Deduct 50 KP
     * THIS FIXES THE 'FIRST LOSS BUG'
     * Ensures immediate deduction even on the very first loss
     * 
     * @param userId The player's ID
     * @return Updated Player entity
     */
    @Transactional
    public Player handleLoss(Long userId) {
        return updateKP(userId, -LOSS_PENALTY);
    }

    /**
     * Restore player's energy after lockout period
     * Adds +50 KP to current balance (not set to 50)
     * 
     * @param userId The player's ID
     * @return Updated Player entity
     */
    @Transactional
    public Player restoreEnergy(Long userId) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        // Add 50 KP to current balance (not set to 50)
        int currentKP = player.getKnowledgePoints();
        player.setKnowledgePoints(currentKP + RESTORED_KP);
        
        // Clear lockout timer
        player.setLastRegenerationTime(LocalDateTime.now());

        return playerRepository.save(player);
    }

    /**
     * Check if player can enter dungeon (needs at least 50 KP)
     * 
     * @param userId The player's ID
     * @return true if player has sufficient KP
     */
    public boolean canPlay(Long userId) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));
        
        return player.getKnowledgePoints() >= LOSS_PENALTY;
    }

    /**
     * Get player's current status including lockout info
     * 
     * @param userId The player's ID
     * @return Player entity
     */
    public Player getPlayerStatus(Long userId) {
        return playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));
    }

    /**
     * Calculate remaining lockout time in seconds
     * 
     * @param player The player entity
     * @return Remaining seconds (0 if not locked)
     */
    public long getRemainingLockoutTime(Player player) {
        if (player.getKnowledgePoints() > 0 || player.getLastRegenerationTime() == null) {
            return 0;
        }

        LocalDateTime now = LocalDateTime.now();
        long secondsPassed = java.time.Duration.between(player.getLastRegenerationTime(), now).getSeconds();
        long remaining = LOCKOUT_DURATION_SECONDS - secondsPassed;

        return remaining > 0 ? remaining : 0;
    }
    
    // 🎁 ========================================
    // DAILY SUPPLY DROP SYSTEM (24-Hour Reward)
    // 🎁 ========================================
    
    private static final int DAILY_REWARD_AMOUNT = 100;
    private static final int DAILY_REWARD_COOLDOWN_HOURS = 24;
    
    /**
     * Claim daily reward (+100 KP) if 24 hours have passed
     * 
     * @param userId The player's ID
     * @return Updated Player entity with new KP
     * @throws RuntimeException if player not found or cooldown is active
     */
    @Transactional
    public Player claimDailyReward(Long userId) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        // Check if player can claim (24 hours passed or first time)
        if (!player.canClaimDailyReward()) {
            long remainingSeconds = player.getRemainingDailyRewardCooldown();
            long hours = remainingSeconds / 3600;
            long minutes = (remainingSeconds % 3600) / 60;
            long seconds = remainingSeconds % 60;
            
            String timeLeft = String.format("%02d:%02d:%02d", hours, minutes, seconds);
            throw new RuntimeException("COOLDOWN_ACTIVE: Next reward in " + timeLeft);
        }

        // Award the reward
        int currentKP = player.getKnowledgePoints();
        player.setKnowledgePoints(currentKP + DAILY_REWARD_AMOUNT);
        player.setLastDailyRewardClaimed(LocalDateTime.now());

        return playerRepository.save(player);
    }
    
    /**
     * Get daily reward status for a player
     * 
     * @param userId The player's ID
     * @return Map containing isReady, remainingSeconds, and nextClaimTime
     */
    public java.util.Map<String, Object> getDailyRewardStatus(Long userId) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        boolean isReady = player.canClaimDailyReward();
        long remainingSeconds = player.getRemainingDailyRewardCooldown();
        
        LocalDateTime nextClaimTime = null;
        if (player.getLastDailyRewardClaimed() != null) {
            nextClaimTime = player.getLastDailyRewardClaimed().plusHours(DAILY_REWARD_COOLDOWN_HOURS);
        }

        java.util.Map<String, Object> status = new java.util.HashMap<>();
        status.put("isReady", isReady);
        status.put("remainingSeconds", remainingSeconds);
        status.put("nextClaimTime", nextClaimTime);
        status.put("rewardAmount", DAILY_REWARD_AMOUNT);
        status.put("lastClaimed", player.getLastDailyRewardClaimed());

        return status;
    }
    
    // 📚 ========================================
    // PERSISTENT BOOK UNLOCK SYSTEM
    // 📚 ========================================
    
    /**
     * Complete a dungeon level for a specific book
     * Awards KP and unlocks book on first-time completion
     * 
     * @param userId The player's ID
     * @param bookId The book's ID that was completed
     * @param isWin Whether the player won (true) or lost (false)
     * @return Map containing: newKp, unlockedBookIds, firstTimeUnlock
     * @throws RuntimeException if player not found
     */
    @Transactional
    public java.util.Map<String, Object> completeLevel(Long userId, Long bookId, boolean isWin) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        // 1. Award or Deduct KP based on win/loss
        int kpChange = isWin ? WIN_REWARD : -LOSS_PENALTY;
        int currentKP = player.getKnowledgePoints();
        int newKP = Math.max(0, currentKP + kpChange); // Mercy rule: never go below 0
        
        player.setKnowledgePoints(newKP);
        
        // If KP hits 0, start lockout timer
        if (newKP == 0) {
            player.setLastRegenerationTime(LocalDateTime.now());
        }

        // 2. Check if this is the first time unlocking this book (ONLY on WIN)
        boolean firstTimeUnlock = false;
        if (isWin) {
            Set<Long> unlockedBooks = player.getUnlockedBooks();
            if (!unlockedBooks.contains(bookId)) {
                player.addUnlockedBook(bookId);
                firstTimeUnlock = true;
            }
        }

        // 3. Save to database IMMEDIATELY
        Player savedPlayer = playerRepository.save(player);

        // 4. Build response map
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("newKp", savedPlayer.getKnowledgePoints());
        response.put("unlockedBookIds", new java.util.ArrayList<>(savedPlayer.getUnlockedBooks()));
        response.put("firstTimeUnlock", firstTimeUnlock);
        response.put("kpChange", kpChange);
        response.put("isLocked", newKP == 0);
        response.put("remainingLockoutTime", getRemainingLockoutTime(savedPlayer));

        return response;
    }
    
    /**
     * Get all unlocked books for a player
     * 
     * @param userId The player's ID
     * @return Set of unlocked book IDs
     */
    public Set<Long> getUnlockedBooks(Long userId) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));
        
        return player.getUnlockedBooks();
    }

    @Transactional
    public java.util.Map<String, Object> recordGameResult(
            Long userId, Integer kpAmount, Long bookId, String gameId, boolean unlockBook) {
        Player player = playerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Player not found with ID: " + userId));

        int currentKp = player.getKnowledgePoints();
        int newKp = Math.max(0, currentKp + kpAmount);
        player.setKnowledgePoints(newKp);

        if (newKp == 0) {
            player.setLastRegenerationTime(LocalDateTime.now());
        }

        if (gameId != null && !gameId.isBlank()) {
            player.addCompletedGame(gameId + (bookId == null ? "" : "-" + bookId));
        }

        boolean firstTimeUnlock = false;
        if (unlockBook && bookId != null && !player.getUnlockedBooks().contains(bookId)) {
            player.addUnlockedBook(bookId);
            firstTimeUnlock = true;
        }

        Player savedPlayer = playerRepository.save(player);
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("knowledgePoints", savedPlayer.getKnowledgePoints());
        response.put("unlockedBooks", savedPlayer.getUnlockedBooks());
        response.put("completedGames", savedPlayer.getCompletedGames());
        response.put("firstTimeUnlock", firstTimeUnlock);
        response.put("isLocked", savedPlayer.getKnowledgePoints() == 0);
        response.put("lockoutSeconds", getRemainingLockoutTime(savedPlayer));
        return response;
    }
}
