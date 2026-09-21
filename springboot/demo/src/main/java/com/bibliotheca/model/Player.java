package com.bibliotheca.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;
import java.time.LocalDateTime;

@Entity
@Table(name = "players")
public class Player {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // 🔥 FIXED: Removed unique = true. Multiple people can have the same name!
    @Column(nullable = false)
    private String username;
    
    // 🔥 FIXED: Added unique = true. Emails MUST be unique!
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password; 
    
    @Column(name = "knowledge_points", columnDefinition = "integer default 100")
    private Integer knowledgePoints = 100; 
    
    @Column(name = "last_regeneration_time")
    private LocalDateTime lastRegenerationTime;
    
    @Column(name = "last_daily_reward_claimed")
    private LocalDateTime lastDailyRewardClaimed;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "player_unlocked_books", joinColumns = @JoinColumn(name = "player_id"))
    @Column(name = "book_id")
    private Set<Long> unlockedBooks = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "player_completed_games", joinColumns = @JoinColumn(name = "player_id"))
    @Column(name = "game_key")
    private Set<String> completedGames = new HashSet<>();
    
    public Player() {}
    
    public Player(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.knowledgePoints = 100;
        this.lastRegenerationTime = LocalDateTime.now();
    }
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public Integer getKnowledgePoints() {
        return knowledgePoints;
    }
    
    public void setKnowledgePoints(Integer knowledgePoints) {
        this.knowledgePoints = knowledgePoints;
    }
    
    public LocalDateTime getLastRegenerationTime() {
        return lastRegenerationTime;
    }
    
    public void setLastRegenerationTime(LocalDateTime lastRegenerationTime) {
        this.lastRegenerationTime = lastRegenerationTime;
    }
    
    public Set<Long> getUnlockedBooks() {
        return unlockedBooks;
    }
    
    public void setUnlockedBooks(Set<Long> unlockedBooks) {
        this.unlockedBooks = unlockedBooks;
    }
    
    public void addUnlockedBook(Long bookId) {
        this.unlockedBooks.add(bookId);
    }

    public Set<String> getCompletedGames() {
        return completedGames;
    }

    public void addCompletedGame(String gameKey) {
        this.completedGames.add(gameKey);
    }
    
    public void addKnowledgePoints(Integer points) {
        this.knowledgePoints += points;
        if (this.knowledgePoints < 0) {
            this.knowledgePoints = 0;
        }
    }
    
    public void deductKnowledgePoints(Integer points) {
        this.knowledgePoints -= points;
        if (this.knowledgePoints < 0) {
            this.knowledgePoints = 0;
            this.lastRegenerationTime = LocalDateTime.now(); 
        }
    }
    
    public boolean canPlay() {
        return this.knowledgePoints >= 50;
    }
    
    public void regenerateKP() {
        if (this.knowledgePoints == 0 && this.lastRegenerationTime != null) {
            LocalDateTime now = LocalDateTime.now();
            long secondsPassed = java.time.Duration.between(this.lastRegenerationTime, now).getSeconds();
            
            if (secondsPassed >= 60) {
                this.knowledgePoints = 50;
                this.lastRegenerationTime = now;
            }
        }
    }
    
    public long getRemainingCooldown() {
        if (this.knowledgePoints > 0 || this.lastRegenerationTime == null) {
            return 0;
        }
        
        LocalDateTime now = LocalDateTime.now();
        long secondsPassed = java.time.Duration.between(this.lastRegenerationTime, now).getSeconds();
        long remaining = 60 - secondsPassed;
        
        return remaining > 0 ? remaining : 0;
    }
    
    public LocalDateTime getLastDailyRewardClaimed() {
        return lastDailyRewardClaimed;
    }
    
    public void setLastDailyRewardClaimed(LocalDateTime lastDailyRewardClaimed) {
        this.lastDailyRewardClaimed = lastDailyRewardClaimed;
    }
    
    public boolean canClaimDailyReward() {
        if (lastDailyRewardClaimed == null) {
            return true; 
        }
        
        LocalDateTime now = LocalDateTime.now();
        long hoursPassed = java.time.Duration.between(lastDailyRewardClaimed, now).toHours();
        
        return hoursPassed >= 24;
    }
    
    public long getRemainingDailyRewardCooldown() {
        if (lastDailyRewardClaimed == null) {
            return 0; 
        }
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextClaimTime = lastDailyRewardClaimed.plusHours(24);
        
        if (now.isAfter(nextClaimTime) || now.isEqual(nextClaimTime)) {
            return 0; 
        }
        
        return java.time.Duration.between(now, nextClaimTime).getSeconds();
    }
}