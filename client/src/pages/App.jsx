import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import '../index.css';
import ChatBot from '../ChatBot';
import DungeonGame from '../DungeonGame';
import LandingPage from './LandingPage';
import LibraryDashboard from './LibraryDashboard';
import BookDetails from './BookDetails';
import DungeonPlatform from './DungeonPlatform';
import Login from '../log_reg/Login';
import Register from '../log_reg/Register';
import Profile from './Profile';
import { GameEconomyProvider, useGameEconomyContext } from '../context/GameEconomyContext';
import RechargeOverlay from '../components/RechargeOverlay';
import AudioController from '../components/AudioController';
import DevConsole from '../components/DevConsole';
import useDailyReward from '../hooks/useDailyReward';
import { books as booksData } from '../data/books';

function AppContent() {
  const [showDungeon, setShowDungeon] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: '', id: null });
  const [selectedBook, setSelectedBook] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('audioMuted') === 'true');

  const [unlockedBooks, setUnlockedBooks] = useState([]);
  const [currentDungeonBook, setCurrentDungeonBook] = useState(null);

  const { kp, isLocked, timer, lockoutProgress } = useGameEconomyContext();
  const { isReady: isDailyRewardReady, timeLeft: dailyTimeLeft } = useDailyReward(user.id);
  const [books, setBooks] = useState(booksData);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        // 🔥 FIXED: Dynamic URL for books
        const API_URL = import.meta.env.VITE_API_URL || 'https://aoopprojectbibliotheca-production.up.railway.app';
        const res = await fetch(`${API_URL}/api/books`);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          category: b.category,
          isbn: b.isbn,
          description: b.description,
          // Corruption is the default state; only the user's unlock record restores access.
          isCorrupted: true,
        }));

        if (normalized.length > 0) {
          setBooks(normalized);
        }
      } catch {
        // keep fallbackBooks
      }
    };

    fetchBooks();
  }, []);

  const servicesData = [
    {
      id: 1,
      type: 'text',
      title: "LIBRARY SERVICE HOUR",
      content: (
        <div style={{fontSize: '0.9rem', color:'#aaa'}}>
          <p style={{marginBottom:'5px'}}><strong>During Semester:</strong></p>
          <p style={{marginBottom:'10px'}}>Mon - Fri: 8:30 AM - 9:00 PM</p>
          <p style={{marginBottom:'5px'}}><strong>During Break:</strong></p>
          <p>Mon - Fri: 8:30 AM - 6:00 PM</p>
        </div>
      )
    },
    {
      id: 2,
      type: 'link',
      icon: "fas fa-book",
      title: "REFERENCE MANAGER",
      desc: "Free reference manager and academic social network.",
      btnText: "VIEW SELECTION",
      link: "#"
    },
    {
      id: 3,
      type: 'link',
      icon: "fas fa-database",
      title: "INSTITUTIONAL REPOSITORY",
      desc: "Digital preservation and scholarly communication.",
      btnText: "VIEW SELECTION",
      link: "https://dspace.uiu.ac.bd/"
    }
  ];

  const newsData = [
    { 
      title: "ATTENTION: ALL UIU STUDENTS", 
      desc: "Shaheed Irfan Library and designated study rooms will remain open to facilitate preparatory studies for Mid-term and Final Exams.", 
      date: "2025-12-14" 
    },
    { 
      title: "LIBRARY OPENING HOURS", 
      desc: "Thursday & Friday: 8:30 AM - 9:00 PM. Please adhere to the schedule.", 
      date: "2025-12-15" 
    },
    { 
      title: "NEW ARRIVALS: PHARMACY", 
      desc: "New journals and reference books for the Department of Pharmacy have arrived in Section C.", 
      date: "2026-01-05" 
    },
    { 
      title: "DIGITAL LIBRARY UPGRADE", 
      desc: "DSpace repository maintenance is complete. You can now access past exam papers online.", 
      date: "2026-01-20" 
    }
  ];

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    console.log('🚪 [LOGOUT] Initiating complete system logout...');
    
    const localStorageKeys = [
      'library_user_data',      
      'userToken',              
      'userId',                 
      'chat_history',           
      'chatMessages',           
      'conversationHistory',    
      'audioMuted',             
      'theme',                  
      'game_economy_state',     
      'daily_reward_timestamp', 
      'lastClaimTime'           
    ];
    
    localStorageKeys.forEach(key => {
      if (key !== 'audioMuted' && key !== 'theme') { 
        localStorage.removeItem(key);
      }
    });
    
    sessionStorage.clear();
    setIsLoggedIn(false);
    setUser({ name: '', id: null });
    setUnlockedBooks([]);
    setSelectedBook(null);
    setCurrentDungeonBook(null);
    
    setTimeout(() => {
      window.location.href = '/'; 
    }, 100); 
  };

  const handleBookClick = (book) => {
    navigate(`/book/${book.id}`);
  };

  const handleEnterDungeon = () => {
    setShowDungeon(false);
    setIsPlaying(true);
  };

  // The game result is already persisted transactionally by DungeonPlatform.
  const handleDungeonWin = async (bookId) => {
    const targetBookId = bookId || currentDungeonBook?.id;
    
    if (targetBookId && !unlockedBooks.includes(targetBookId)) {
      setUnlockedBooks(prev => [...prev, targetBookId]);
    }
    
    setIsPlaying(false);
  };

  const handleDungeonLoss = async () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    const checkUserAuth = async () => {
      const storedUser = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
      const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      
      if (storedUser && storedUserId) {
        try {
          const userData = JSON.parse(storedUser);
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

          // Keep the authenticated session visible while the server state refreshes.
          // A temporary profile request failure must not log the user out.
          setIsLoggedIn(true);
          setUser({
            name: userData.username || '',
            id: parseInt(storedUserId)
          });

          const response = await fetch(`${API_URL}/api/players/${storedUserId}`);
          if (response.ok) {
            const serverUser = await response.json();
            setUser({
              name: serverUser.username || userData.username || '',
              id: parseInt(storedUserId)
            });
            setUnlockedBooks(serverUser.unlockedBooks || []);
          } else {
            console.warn(`Player refresh returned HTTP ${response.status}; keeping session active.`);
          }
        } catch (error) {
          console.warn('Player refresh failed; keeping the authenticated session active.', error);
        }
      } else {
        setIsLoggedIn(false);
        setUser({ name: '', id: null });
        setUnlockedBooks([]);
      }
    };

    checkUserAuth();
  }, [location]); 

  if (isLocked) {
    return (
      <RechargeOverlay 
        isVisible={isLocked}
        timer={timer}
        progress={lockoutProgress}
      />
    );
  }

  return (
    <div className="app-container">
      <AudioController onMuteChange={setIsMuted} />
      <DevConsole />

      <nav className="navbar">
        <div className="container">
          <div className="nav-wrapper">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <div className="logo-icon"><i className="fas fa-book-open"></i></div>
              <h2>Bibliotheca</h2>
            </div>
            <ul className="nav-menu">
              <li><a href="/#services">Services</a></li>
              <li><a href="/#books">Books</a></li>
              <li><a href="/#news">News</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <div className="nav-controls">
              {!isLoggedIn ? (
                <div className="auth-buttons">
                  <button className="btn-login" onClick={() => navigate('/login')}>Login</button>
                  <button className="btn-signup" onClick={() => navigate('/register')}>Sign Up</button>
                </div>
              ) : (
                <div className="player-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isLoggedIn && user.id && (
                    <div
                      onClick={() => navigate('/profile')}
                      style={{
                        background: isDailyRewardReady 
                          ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                          : 'rgba(255, 255, 255, 0.1)',
                        border: isDailyRewardReady ? '2px solid #FFD700' : '2px solid #555',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        color: isDailyRewardReady ? '#000' : '#888',
                        transition: 'all 0.3s ease',
                        animation: isDailyRewardReady ? 'pulse 1.5s infinite' : 'none',
                        boxShadow: isDailyRewardReady ? '0 0 15px rgba(255, 215, 0, 0.5)' : 'none'
                      }}
                    >
                      <i className="fas fa-gift" style={{ fontSize: '1.1rem' }}></i>
                      {isDailyRewardReady ? <span>READY!</span> : <span>{dailyTimeLeft}</span>}
                    </div>
                  )}
                  
                  <button 
                    className="btn-profile"
                    onClick={() => navigate('/profile')}
                    style={{
                      background: 'linear-gradient(135deg, #924EFF, #00C6FF)',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <i className="fas fa-id-card"></i> AGENT ID
                  </button>
                  <span style={{color: '#aaa'}}>{user.name}</span>
                  <span className="kp-display"><i className="fas fa-star"></i> {kp} KP</span>
                  <button className="btn-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i></button>
                </div>
              )}
              
              <button 
                className="theme-toggle" 
                onClick={() => window.toggleAudio && window.toggleAudio()}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              </button>
              
              <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
                <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <div className="mobile-menu-toggle"><i className="fas fa-bars"></i></div>
            </div>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<LandingPage books={books} handleBookClick={handleBookClick} servicesData={servicesData} newsData={newsData} isLoggedIn={isLoggedIn} />} />
        <Route path="/dashboard" element={<LibraryDashboard books={books} handleBookClick={handleBookClick} user={{...user, kp}} />} />
        <Route path="/book/:id" element={<BookDetails books={books} onEnterDungeon={handleEnterDungeon} unlockedBooks={unlockedBooks} />} />
        <Route path="/dungeon-platform/:bookId" element={<DungeonPlatform books={books} unlockedBooks={unlockedBooks} onWin={handleDungeonWin} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile user={{...user, kp}} unlockedBooks={unlockedBooks} />} />
      </Routes>

      <footer className="discord-footer" id="contact">
        <div className="container">
            <div className="discord-footer-grid">
                <div className="footer-brand">
                    <h2><i className="fas fa-book-open"></i> Bibliotheca</h2>
                    <p style={{color:'#aaa', maxWidth:'300px'}}>Your gateway to knowledge. Explore our vast collection of digital and physical resources.</p>
                    <div className="social-row">
                        <i className="fab fa-twitter"></i>
                        <i className="fab fa-instagram"></i>
                        <i className="fab fa-facebook"></i>
                        <i className="fab fa-youtube"></i>
                    </div>
                </div>
                <div className="footer-col">
                    <h4>Contact</h4>
                    <ul>
                        <li><p><i className="fas fa-map-marker-alt"></i> University Campus</p></li>
                        <li><p><i className="fas fa-envelope"></i> library@edu.com</p></li>
                        <li><p><i className="fas fa-phone"></i> +1 (234) 567-890</p></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Discover</h4>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#books">Books</a></li>
                        <li><a href="#services">Services</a></li>
                        <li><a href="#news">News</a></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4>Timing</h4>
                    <ul>
                        <li><p><strong>Sem:</strong> 8:30 AM - 9:00 PM</p></li>
                        <li><p><strong>Break:</strong> 8:30 AM - 6:00 PM</p></li>
                        <li><p style={{color:'#ff5555'}}>Closed on Holidays</p></li>
                    </ul>
                </div>
            </div>
            <div className="discord-bottom">
                <button className="btn-primary" onClick={() => navigate('/register')}>Sign Up Now</button>
                <p style={{color:'#777'}}>&copy; 2026 Bibliotheca. All rights reserved.</p>
            </div>
        </div>
      </footer>

      <ChatBot />

      {isPlaying && (
        <DungeonGame 
          onClose={() => setIsPlaying(false)}
          onWin={() => handleDungeonWin(currentDungeonBook?.id)}
          onLoss={handleDungeonLoss}
        />
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState({ name: '', id: null });
  const location = useLocation();

  useEffect(() => {
    const checkUserAuth = async () => {
      const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (storedUserId) {
        setUser(prev => ({ ...prev, id: parseInt(storedUserId) }));
      }
    };
    checkUserAuth();
  }, [location]);

  return (
    <GameEconomyProvider userId={user.id}>
      <AppContent />
    </GameEconomyProvider>
  );
}

export default App;