package com.bibliotheca.controller;

import com.bibliotheca.model.Player;
import com.bibliotheca.repository.BookRepository;
import com.bibliotheca.repository.PlayerRepository;
import com.bibliotheca.service.PlayerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Collections;

@RestController
@RequestMapping("/api/players")
@CrossOrigin(
    origins = {
        "https://*.vercel.app",
        "https://aoop-project-biblio-theca-lbubkhie5-nusrat-bably.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
    },
    allowedHeaders = "*",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS, RequestMethod.PATCH},
    allowCredentials = "true"
)
public class PlayerController {

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerService playerService;

        @Autowired
        private BookRepository bookRepository;

        private void addSystemStatus(Map<String, Object> response, Player player) {
        int totalBooks = (int) bookRepository.count();
        int restoredCount = (int) bookRepository.findAll().stream()
            .filter(book -> player.getUnlockedBooks().contains(book.getId()))
            .count();
        int corruptionPercentage = totalBooks == 0
            ? 0
            : Math.round(((totalBooks - restoredCount) * 100.0f) / totalBooks);

        response.put("systemStatus", Map.of(
            "isStable", restoredCount == totalBooks,
            "status", restoredCount == totalBooks ? "STABLE" : "UNSTABLE",
            "restoredCount", restoredCount,
            "totalCorrupted", totalBooks,
            "corruptionPercentage", corruptionPercentage
        ));
        }

    // Register a new player
    @PostMapping("/register")
    public ResponseEntity<?> registerPlayer(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username"); // Still captures the name
        String email = credentials.get("email");
        String password = credentials.get("password");

        // 🔥 FIXED: We only check if the EMAIL exists now. Names can be duplicated!
        if (playerRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email already exists"));
        }

        Player player = new Player(username, email, password);
        playerRepository.save(player);

        Map<String, Object> response = new HashMap<>();
        response.put("id", player.getId());
        response.put("username", player.getUsername());
        response.put("email", player.getEmail());
        response.put("knowledgePoints", player.getKnowledgePoints());
        response.put("unlockedBooks", player.getUnlockedBooks());
        response.put("completedGames", player.getCompletedGames());
        addSystemStatus(response, player);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Login - Accept either email or username
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String usernameOrEmail = credentials.get("username");
        String password = credentials.get("password");

        // Try to find by email first (since it's unique), then by username
        Optional<Player> playerOpt = playerRepository.findByEmail(usernameOrEmail);
        
        if (playerOpt.isEmpty()) {
            playerOpt = playerRepository.findByUsername(usernameOrEmail);
        }

        if (playerOpt.isEmpty() || !playerOpt.get().getPassword().equals(password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        }

        Player player = playerOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("id", player.getId());
        response.put("username", player.getUsername());
        response.put("email", player.getEmail());
        response.put("knowledgePoints", player.getKnowledgePoints());
        response.put("unlockedBooks", player.getUnlockedBooks());
        response.put("completedGames", player.getCompletedGames());
        addSystemStatus(response, player);

        return ResponseEntity.ok(response);
    }

    // Get player profile
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlayer(@PathVariable Long id) {
        Optional<Player> playerOpt = playerRepository.findById(id);

        if (playerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Player not found"));
        }

        Player player = playerOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("id", player.getId());
        response.put("username", player.getUsername());
        response.put("email", player.getEmail());
        response.put("knowledgePoints", player.getKnowledgePoints());
        response.put("unlockedBooks", player.getUnlockedBooks());
        response.put("completedGames", player.getCompletedGames());
        addSystemStatus(response, player);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/kp")
    public ResponseEntity<?> updateKnowledgePoints(@PathVariable Long id, @RequestBody Map<String, Integer> request) {
        try {
            Integer amount = request.get("amount");
            Player updatedPlayer = playerService.updateKP(id, amount);

            Map<String, Object> response = new HashMap<>();
            response.put("id", updatedPlayer.getId());
            response.put("username", updatedPlayer.getUsername());
            response.put("knowledgePoints", updatedPlayer.getKnowledgePoints());
            response.put("isLocked", updatedPlayer.getKnowledgePoints() == 0);
            response.put("lockoutSeconds", playerService.getRemainingLockoutTime(updatedPlayer));
            response.put("message", amount > 0 ? "KP increased" : "KP deducted");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restoreEnergy(@PathVariable Long id) {
        try {
            Player restoredPlayer = playerService.restoreEnergy(id);

            Map<String, Object> response = new HashMap<>();
            response.put("id", restoredPlayer.getId());
            response.put("username", restoredPlayer.getUsername());
            response.put("knowledgePoints", restoredPlayer.getKnowledgePoints());
            response.put("isLocked", false);
            response.put("message", "Energy restored! Neural link recharged to 50 KP");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/unlock-book")
    public ResponseEntity<?> unlockBook(@PathVariable Long id, @RequestBody Map<String, Long> request) {
        Optional<Player> playerOpt = playerRepository.findById(id);

        if (playerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Player not found"));
        }

        Player player = playerOpt.get();
        Long bookId = request.get("bookId");
        
        if (bookId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "bookId is required"));
        }

        // Persist the unlock independently. The game completion endpoint owns KP
        // changes, so this endpoint is safe to retry and cannot award duplicate XP.
        player.addUnlockedBook(bookId);
        player = playerRepository.save(player);

        Map<String, Object> response = new HashMap<>();
        response.put("id", player.getId());
        response.put("username", player.getUsername());
        response.put("knowledgePoints", player.getKnowledgePoints());
        response.put("unlockedBooks", player.getUnlockedBooks());
        response.put("message", "Book unlocked successfully");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/dungeon-failed")
    public ResponseEntity<?> dungeonFailed(@PathVariable Long id) {
        try {
            Player player = playerService.handleLoss(id);

            Map<String, Object> response = new HashMap<>();
            response.put("id", player.getId());
            response.put("username", player.getUsername());
            response.put("knowledgePoints", player.getKnowledgePoints());
            response.put("isLocked", player.getKnowledgePoints() == 0);
            response.put("lockoutSeconds", playerService.getRemainingLockoutTime(player));
            response.put("message", "Dungeon failed! -50 KP");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/can-play")
    public ResponseEntity<?> canPlay(@PathVariable Long id) {
        try {
            Player player = playerService.getPlayerStatus(id);

            Map<String, Object> response = new HashMap<>();
            response.put("canPlay", playerService.canPlay(id));
            response.put("knowledgePoints", player.getKnowledgePoints());
            response.put("lockoutSeconds", playerService.getRemainingLockoutTime(player));
            response.put("minimumRequired", 50);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/add-kp")
    public ResponseEntity<?> addKnowledgePoints(@PathVariable Long id, @RequestBody Map<String, Integer> request) {
        Optional<Player> playerOpt = playerRepository.findById(id);

        if (playerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Player not found"));
        }

        Player player = playerOpt.get();
        Integer points = request.get("points");
        
        player.addKnowledgePoints(points);
        playerRepository.save(player);

        Map<String, Object> response = new HashMap<>();
        response.put("knowledgePoints", player.getKnowledgePoints());
        response.put("message", "Added " + points + " KP");

        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{id}/daily-reward/status")
    public ResponseEntity<?> getDailyRewardStatus(@PathVariable Long id) {
        try {
            Map<String, Object> status = playerService.getDailyRewardStatus(id);
            return ResponseEntity.ok(status);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/{id}/daily-reward/claim")
    public ResponseEntity<?> claimDailyReward(@PathVariable Long id) {
        try {
            Player player = playerService.claimDailyReward(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("id", player.getId());
            response.put("username", player.getUsername());
            response.put("knowledgePoints", player.getKnowledgePoints());
            response.put("message", "Daily reward claimed! +100 KP");
            response.put("rewardAmount", 100);
            response.put("nextClaimTime", player.getLastDailyRewardClaimed().plusHours(24));
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            String errorMessage = e.getMessage();
            
            if (errorMessage.startsWith("COOLDOWN_ACTIVE")) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(Map.of(
                            "error", "COOLDOWN_ACTIVE",
                            "message", errorMessage.substring("COOLDOWN_ACTIVE: ".length())
                        ));
            }
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", errorMessage));
        }
    }
    
    @PostMapping("/{id}/complete-level")
    public ResponseEntity<?> completeLevel(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            Long bookId = Long.valueOf(request.get("bookId").toString());
            Boolean isWin = (Boolean) request.get("isWin");
            
            Map<String, Object> result = playerService.completeLevel(id, bookId, isWin);
            
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/progress")
    public ResponseEntity<?> recordProgress(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            Integer kpAmount = Integer.valueOf(request.get("kpAmount").toString());
            Long bookId = request.get("bookId") == null ? null : Long.valueOf(request.get("bookId").toString());
            String gameId = request.get("gameId") == null ? null : request.get("gameId").toString();
            boolean unlockBook = Boolean.TRUE.equals(request.get("unlockBook"));
            return ResponseEntity.ok(playerService.recordGameResult(id, kpAmount, bookId, gameId, unlockBook));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/{id}/unlocked-books")
    public ResponseEntity<?> getUnlockedBooks(@PathVariable Long id) {
        try {
            java.util.Set<Long> unlockedBooks = playerService.getUnlockedBooks(id);
            return ResponseEntity.ok(unlockedBooks);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<?> unlockBookSimple(@PathVariable Long id, @RequestBody Map<String, Long> request) {
        try {
            Optional<Player> playerOpt = playerRepository.findById(id);
            
            if (playerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Player not found"));
            }

            Player player = playerOpt.get();
            Long bookId = request.get("bookId");
            
            if (bookId != null && !player.getUnlockedBooks().contains(bookId)) {
                player.addUnlockedBook(bookId);
                playerRepository.save(player);
            }
            
            return ResponseEntity.ok(Collections.singletonMap("message", "Book successfully purified and permanently saved to PostgreSQL!"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}