import { useState } from 'react';
import { useUser } from './context/UserContext';
import { books as booksData } from './data/books';
import './ChatBot.css';

/**
 * ChatBot - Real AI Integration with Ghost Librarian Persona
 * 
 * Features:
 * - Connects to Spring Boot Backend for live AI generation
 * - Injects live game context (KP, Books) into the AI prompt
 * - Fallback to local Wizard of Oz script if backend is offline
 */

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ghost', text: '👻 Welcome, mortal... I am the Ghost Librarian. The archives whisper secrets to me. Ask, and I shall reveal what you seek...' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 🔥 GET REAL-TIME USER DATA
  const { user } = useUser();

  /**
   * 🎭 OFFLINE FALLBACK ENGINE
   * Generates scripted responses if the backend AI fails or is turned off
   */
  const generateMockResponse = (input) => {
    const lowerInput = input.toLowerCase().trim();
    const totalBooks = booksData.length;
    const corruptedBooks = booksData.filter(book => book.isCorrupted);
    const totalCorrupted = corruptedBooks.length;
    const unlockedBooks = user?.unlockedBooks || [];
    
    const restoredCount = corruptedBooks.filter(book => 
      unlockedBooks.includes(book.id) || unlockedBooks.includes(String(book.id))
    ).length;
    
    const stillCorrupted = totalCorrupted - restoredCount;
    const userKP = user?.kp || 0;

    if (lowerInput.match(/\b(hi|hello|hey|greetings|sup|yo)\b/)) {
      return "👻 Greetings, mortal... I sense your presence in the ethereal realm. The spirits have much to tell you. What knowledge do you seek?";
    }
    if (lowerInput.match(/\b(how many|count|total|number of)\b/) || lowerInput.includes('books')) {
      return `🕯️ *The candles flicker as I consult the spectral archives...*\n\n📚 The spirits whisper:\n• Total Volumes: ${totalBooks} ancient tomes\n• ✅ RESTORED: ${restoredCount}\n• 🔴 CORRUPTED: ${stillCorrupted}\n\n*${stillCorrupted === 0 ? 'All books have been liberated! 🌟' : 'The books cry out for salvation...* '}`;
    }
    if (lowerInput.match(/\b(status|system|health|integrity|check)\b/)) {
      const corruptionPercentage = totalCorrupted > 0 ? Math.round((stillCorrupted / totalCorrupted) * 100) : 0;
      return corruptionPercentage === 0
        ? '✅ SYSTEM INTEGRITY: STABLE\n\n🔮 All corruption has been purged. Peace has returned to the digital realm...'
        : `💀 *The ethereal winds grow cold...*\n\n⚠️ SYSTEM INTEGRITY: UNSTABLE\n\n🔮 Corruption spreads through ${corruptionPercentage}% of archives. Immediate exorcism protocols required.`;
    }
    if (lowerInput.match(/\b(kp|knowledge|points|xp|experience|earn)\b/)) {
      const clearanceLevel = Math.floor(userKP / 100) + 1;
      return `💰 YOUR SPIRITUAL ESSENCE:\n✨ Current KP: ${userKP}\n🎖️ Clearance Level: ${clearanceLevel}\n\n*The spirits reward those who serve the library...*`;
    }
    if (lowerInput.match(/\b(book|purify|corrupt|unlock|restore|access)\b/)) {
      return "📖 BOOK EXORCISM RITUAL:\n1️⃣ Identify the CURSED tome\n2️⃣ Click 'PURIFY'\n3️⃣ Complete the spiritual challenge to liberate it!";
    }
    return "👻 *The ghost tilts its ethereal head in confusion...*\n\n⚡ Your words echo strangely through the void, mortal...\nPerhaps ask about 'System Status', 'Book Count', or 'KP'.";
  };

  /**
   * 📤 SEND MESSAGE HANDLER
   * Connects to Spring Boot AI Backend
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // 1. Add user message to UI
    const userMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // 2. Build the context-aware prompt for the AI
      const userKP = user?.kp || 0;
      const restoredCount = user?.unlockedBooks?.length || 0;
      
      const engineeredPrompt = `
        You are the Ghost Librarian of the BiblioTheca digital library. 
        Adopt a spooky, ethereal, and wise persona. 
        Context about the current user: They have ${userKP} Knowledge Points (KP) and have restored ${restoredCount} corrupted books.
        User asks: "${currentInput}"
        Please answer the user concisely in character.
      `;

      // 3. Send request matching your Java ChatRequest model
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: engineeredPrompt,        // Matches ChatRequest.getMessage()
          conversationHistory: []           // Matches ChatRequest.getConversationHistory()
        })
      });

      if (!response.ok) throw new Error('Backend AI request failed');
      
      // 4. Parse the JSON matching your Java ChatResponse model
      const data = await response.json();
      
      // We check multiple common field names (response, message, text, aiResponse)
      // to ensure we grab the right string from your ChatResponse object!
      const aiResponseText = data.response || data.message || data.text || data.aiResponse || "👻 *The spirits are whispering in a language I cannot decipher...*";
      
      setMessages(prev => [...prev, { sender: 'ghost', text: aiResponseText }]);

    } catch (error) {
      console.error("AI API failed, falling back to local ghost script:", error);
      
      // 5. Offline Fallback Logic
      setTimeout(() => {
        const ghostResponse = generateMockResponse(currentInput);
        setMessages(prev => [...prev, { sender: 'ghost', text: ghostResponse }]);
      }, 1000);

    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isTyping) {
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="chatbot-float-btn" onClick={() => setIsOpen(!isOpen)} title="Summon the Ghost Librarian">
        <i className="fas fa-ghost"></i>
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <i className="fas fa-ghost" style={{marginRight: '10px'}}></i>
              <span>Ghost Librarian</span>
              <span style={{
                fontSize: '0.7rem', marginLeft: '8px', opacity: 0.6,
                background: 'rgba(138, 43, 226, 0.2)', padding: '2px 6px',
                borderRadius: '4px', color: '#a78bfa'
              }}>ETHEREAL</span>
            </div>
            <button className="chatbot-close-btn" onClick={handleClose}>&times;</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-message ${msg.sender === 'user' ? 'user-message' : 'ghost-message'}`}>
                <div className="message-bubble" style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chatbot-message ghost-message">
                <div className="message-bubble typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-input-area">
            <input 
              type="text" 
              placeholder="Whisper to the Ghost Librarian..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="chatbot-input"
              disabled={isTyping}
            />
            <button className="chatbot-send-btn" onClick={handleSendMessage} disabled={isTyping || !inputValue.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;