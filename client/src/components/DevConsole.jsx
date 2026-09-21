import { useState, useEffect, useRef } from 'react';

/**
 * DevConsole - Developer 'God Mode' Console
 * 
 * Features:
 * - Press ` (backtick) to toggle
 * - Cheat commands: add_kp, heal, clear
 * - Hacker-style terminal UI
 * - Command history with up/down arrows
 */
function DevConsole() {
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState([
    { type: 'system', text: '> BiblioTheca Developer Console v1.0.0' },
    { type: 'system', text: '> Type "help" for available commands' },
    { type: 'system', text: '' },
  ]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef(null);
  const outputRef = useRef(null);

  /**
   * Get userId from localStorage
   */
  const getUserId = () => {
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    return userId ? parseInt(userId) : null;
  };

  /**
   * Toggle console visibility with backtick key
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '`') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Auto-focus input when console opens
   */
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  /**
   * Auto-scroll output to bottom
   */
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  /**
   * Add message to output
   */
  const addOutput = (text, type = 'normal') => {
    setOutput(prev => [...prev, { type, text }]);
  };

  /**
   * Execute command
   */
  const executeCommand = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to output
    addOutput(`> ${trimmed}`, 'input');

    // Add to command history
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Parse command
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const userId = getUserId();

    switch (command) {
      case 'help':
        addOutput('Available commands:', 'success');
        addOutput('  add_kp <amount>  - Add Knowledge Points (cheat)', 'normal');
        addOutput('  heal             - Restore energy to 50 KP', 'normal');
        addOutput('  clear            - Clear console output', 'normal');
        addOutput('  help             - Show this help message', 'normal');
        addOutput('  status           - Show current player stats', 'normal');
        break;

      case 'add_kp':
        if (!userId) {
          addOutput('ERROR: User not logged in', 'error');
          break;
        }
        if (!args[0] || isNaN(args[0])) {
          addOutput('USAGE: add_kp <amount>', 'error');
          break;
        }
        try {
          const amount = parseInt(args[0]);
          addOutput(`Calling API: POST /api/players/${userId}/kp {"amount": ${amount}}`, 'normal');
          
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
          const response = await fetch(`${API_URL}/api/players/${userId}/kp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          addOutput(`SUCCESS: KP updated to ${data.knowledgePoints}`, 'success');
          addOutput(`> isLocked: ${data.isLocked}`, 'normal');
          
          // Force UI refresh
          window.location.reload();
        } catch (err) {
          addOutput(`ERROR: ${err.message}`, 'error');
        }
        break;

      case 'heal':
        if (!userId) {
          addOutput('ERROR: User not logged in', 'error');
          break;
        }
        try {
          addOutput(`Calling API: POST /api/players/${userId}/restore`, 'normal');
          
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
          const response = await fetch(`${API_URL}/api/players/${userId}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          addOutput(`SUCCESS: Energy restored to ${data.knowledgePoints} KP`, 'success');
          addOutput(`> ${data.message}`, 'normal');
          
          // Force UI refresh
          window.location.reload();
        } catch (err) {
          addOutput(`ERROR: ${err.message}`, 'error');
        }
        break;

      case 'clear':
        setOutput([
          { type: 'system', text: '> Console cleared' },
          { type: 'system', text: '' },
        ]);
        break;

      case 'status':
        if (!userId) {
          addOutput('ERROR: User not logged in', 'error');
          break;
        }
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
          const response = await fetch(`${API_URL}/api/players/${userId}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          addOutput('PLAYER STATUS:', 'success');
          addOutput(`  ID: ${data.id}`, 'normal');
          addOutput(`  Username: ${data.username}`, 'normal');
          addOutput(`  Knowledge Points: ${data.knowledgePoints}`, 'normal');
          addOutput(`  Unlocked Books: ${data.unlockedBooks?.length || 0}`, 'normal');
        } catch (err) {
          addOutput(`ERROR: ${err.message}`, 'error');
        }
        break;

      default:
        addOutput(`Unknown command: ${command}`, 'error');
        addOutput('Type "help" for available commands', 'normal');
        break;
    }
  };

  /**
   * Handle input submit
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(input);
    setInput('');
  };

  /**
   * Handle command history navigation
   */
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.title}>
            <span style={styles.icon}>⚡</span>
            DEV CONSOLE
            <span style={styles.badge}>GOD MODE</span>
          </div>
          <div style={styles.hint}>Press ` to close</div>
        </div>

        {/* Output */}
        <div style={styles.output} ref={outputRef}>
          {output.map((line, i) => (
            <div
              key={i}
              style={{
                ...styles.outputLine,
                color: 
                  line.type === 'error' ? '#ff4444' :
                  line.type === 'success' ? '#00ff41' :
                  line.type === 'input' ? '#00ffff' :
                  line.type === 'system' ? '#888' :
                  '#0f0',
              }}
            >
              {line.text}
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={styles.inputForm}>
          <span style={styles.prompt}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.input}
            placeholder="Enter command..."
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    background: 'rgba(0, 0, 0, 0.95)',
    backdropFilter: 'blur(10px)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '2px solid #00ff41',
    boxShadow: '0 10px 40px rgba(0, 255, 65, 0.3)',
    fontFamily: '"Courier New", "Consolas", monospace',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(0, 255, 65, 0.3)',
  },
  title: {
    color: '#00ff41',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '18px',
    animation: 'pulse 2s infinite',
  },
  badge: {
    background: 'rgba(255, 68, 68, 0.2)',
    color: '#ff4444',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    border: '1px solid #ff4444',
  },
  hint: {
    color: '#666',
    fontSize: '11px',
  },
  output: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '10px',
    paddingRight: '10px',
  },
  outputLine: {
    fontSize: '12px',
    lineHeight: '1.5',
    marginBottom: '2px',
    wordBreak: 'break-word',
  },
  inputForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(0, 255, 65, 0.05)',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 255, 65, 0.3)',
  },
  prompt: {
    color: '#00ff41',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#0f0',
    fontSize: '13px',
    fontFamily: 'inherit',
    caretColor: '#00ff41',
  },
};

export default DevConsole;
