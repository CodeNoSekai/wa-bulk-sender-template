import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './MessageSender.css';

const socket = io(); // defaults to current origin

const MessageSender = () => {
  const [numbersText, setNumbersText] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [activeTab, setActiveTab] = useState('hydrated-button');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const logsRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Hydrated button params
  const [buttonText, setButtonText] = useState('View More');
  const [buttonUrl, setButtonUrl] = useState('https://www.google.com');
  const [messageTitle, setMessageTitle] = useState("Guru's Api");
  const [messageSubtitle, setMessageSubtitle] = useState('Subtitle Message');
  const [messageFooter, setMessageFooter] = useState('Guru Sensei');

  // Canvas background animation with stars
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    
    // Star properties
    const stars = [];
    const maxStars = 150;
    const maxDistance = 150; // Max distance to connect stars
    
    // Create stars
    for (let i = 0; i < maxStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1
      });
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw stars and connect them
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      
      stars.forEach((star, i) => {
        // Move the star
        star.x += star.vx;
        star.y += star.vy;
        
        // Bounce when hitting the edge
        if (star.x < 0 || star.x > canvas.width) star.vx = -star.vx;
        if (star.y < 0 || star.y > canvas.height) star.vy = -star.vy;
        
        // Draw the star
        ctx.moveTo(star.x, star.y);
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        
        // Connect with other stars
        for (let j = i + 1; j < stars.length; j++) {
          const otherStar = stars[j];
          const distance = Math.hypot(star.x - otherStar.x, star.y - otherStar.y);
          
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - distance/maxDistance) * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(star.x, star.y);
            ctx.lineTo(otherStar.x, otherStar.y);
            ctx.stroke();
          }
        }
      });
      
      ctx.fill();
      animationFrameId = window.requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  useEffect(() => {
    // Listen for status updates
    socket.on('status', (msg) => {
      setLogs(prev => [...prev, msg]);
    });

    // Listen for real-time count updates
    socket.on('counts', (counts) => {
      setRealtimeStats(counts);
    });

    return () => {
      socket.off('status');
      socket.off('counts');
    };
  }, []);

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSend = async () => {
    if (!numbersText || !message) return alert('Enter both numbers and message');

    setSending(true);
    setLogs(['🚀 Sending initiated...']);
    setSummary(null);
    setRealtimeStats(null);

    try {
      const response = await axios.post('/pair/send-messages', { 
        numbersText, 
        message,
        buttonText,
        buttonUrl,
        messageTitle,
        messageSubtitle,
        messageFooter
      });
      
      // Display the summary data returned from API
      if (response.data.summary) {
        setSummary(response.data.summary);
        setLogs(prev => [
          ...prev, 
          `📊 Summary: Total: ${response.data.summary.total}, ` +
          `Successful: ${response.data.summary.successful}, ` +
          `Failed: ${response.data.summary.failed}`
        ]);
      }
    } catch (err) {
      setLogs(prev => [...prev, '❌ Send request failed']);
      // If error response contains summary data, still show it
      if (err.response?.data?.summary) {
        setSummary(err.response.data.summary);
        setLogs(prev => [
          ...prev, 
          `📊 Summary: Total: ${err.response.data.summary.total}, ` +
          `Successful: ${err.response.data.summary.successful}, ` +
          `Failed: ${err.response.data.summary.failed}`
        ]);
      }
    }

    setSending(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderHydratedButtonSender = () => {
    return (
      <div className="content-area glass-dark">
        <h3>Send Messages with Button</h3>
        
        <div className="input-group">
          <label>Phone Numbers (one per line)</label>
          <textarea
            placeholder="Enter phone numbers here..."
            rows="5"
            value={numbersText}
            onChange={(e) => setNumbersText(e.target.value)}
          />
        </div>
        
        <div className="input-group">
          <label>Message</label>
          <textarea
            placeholder="Your message here..."
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        <div className="button-settings glass-darker">
          <h4>Button Settings</h4>
          <div className="form-row">
            <div className="input-group">
              <label>Button Text</label>
              <input 
                type="text" 
                value={buttonText} 
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Button Text"
              />
            </div>
            <div className="input-group">
              <label>URL</label>
              <input 
                type="text" 
                value={buttonUrl} 
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          
          <h4>Message Settings</h4>
          <div className="form-row">
            <div className="input-group">
              <label>Title</label>
              <input 
                type="text" 
                value={messageTitle} 
                onChange={(e) => setMessageTitle(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Subtitle</label>
              <input 
                type="text" 
                value={messageSubtitle} 
                onChange={(e) => setMessageSubtitle(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="input-group">
              <label>Footer</label>
              <input 
                type="text" 
                value={messageFooter} 
                onChange={(e) => setMessageFooter(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <button 
          className="send-button" 
          onClick={handleSend} 
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send Messages'}
        </button>
      </div>
    );
  };

  return (
    <div className="app-container dark-theme">
      {/* Star background */}
      <canvas ref={canvasRef} className="star-background"></canvas>
      
      {/* Top Navigation - Fixed */}
      <div className="top-nav fixed-nav glass-nav">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
        <h1>Guru's WA APIs</h1>
        <div className="nav-spacer"></div> {/* This helps with centering */}
      </div>
      
      <div className="main-content">
        {/* Sidebar - conditionally rendered */}
        {sidebarOpen && (
          <div className="sidebar glass-dark">
            <div 
              className={`sidebar-item ${activeTab === 'hydrated-button' ? 'active' : ''}`}
              onClick={() => setActiveTab('hydrated-button')}
            >
              <span className="sidebar-icon">📲</span>
              Send Hydrated Button
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'simple-message' ? 'active' : ''}`}
              onClick={() => setActiveTab('simple-message')}
            >
              <span className="sidebar-icon">✉️</span>
              Simple Message
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="sidebar-icon">⚙️</span>
              Settings
            </div>
          </div>
        )}
        
        {/* Content Area */}
        <div className={`content-wrapper ${!sidebarOpen ? 'full-width' : ''}`}>
          {activeTab === 'hydrated-button' && renderHydratedButtonSender()}
          {activeTab === 'simple-message' && <div className="content-area glass-dark"><h3>Simple Message Sender (Coming Soon)</h3></div>}
          {activeTab === 'settings' && <div className="content-area glass-dark"><h3>Settings (Coming Soon)</h3></div>}
          
          {/* Real-time stats during sending */}
          {sending && realtimeStats && (
            <div className="summary-box realtime glass-dark">
              <h4>Live Progress</h4>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{realtimeStats.total}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Successful:</span>
                  <span className="stat-value success">{realtimeStats.successful}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failed:</span>
                  <span className="stat-value failed">{realtimeStats.failed}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Remaining:</span>
                  <span className="stat-value">{realtimeStats.total - realtimeStats.successful - realtimeStats.failed}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Final summary after completion */}
          {!sending && summary && (
            <div className="summary-box glass-dark">
              <h4>Message Summary</h4>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{summary.total}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Successful:</span>
                  <span className="stat-value success">{summary.successful}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failed:</span>
                  <span className="stat-value failed">{summary.failed}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Status Console */}
          <div className="status-box glass-darker">
            <h4>Status Console</h4>
            <div className="logs" ref={logsRef}>
              {logs.map((log, i) => (
                <p key={i}>{log}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="footer-text">
        Built with ❤️ by GURU
      </footer>
    </div>
  );
};

export default MessageSender;