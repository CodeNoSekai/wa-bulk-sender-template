import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { gsap } from 'gsap'; 
import './MessageSender.css';

const CustomCursor = () => {
  const [isMoving, setIsMoving] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const cursorRef = useRef(null);
  const trailRefs = useRef([]);
  const trailLength = 10; // Adjust size here
  const mousePosition = useRef({ x: -100, y: -100 });
  const movementTimeout = useRef(null);
  const animationFrameId = useRef(null);

  useEffect(() => {
    const segments = Array(trailLength)
      .fill()
      .map(() => React.createRef());
    trailRefs.current = segments;
    return () => {
      trailRefs.current = [];
    };
  }, [trailLength]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;
      mousePosition.current = { x, y };

      gsap.to(cursorRef.current, {
        x,
        y,
        duration: 0.8,
        ease: "power2.out"
      });

      setIsMoving(true);
      if (movementTimeout.current) {
        clearTimeout(movementTimeout.current);
      }

      movementTimeout.current = setTimeout(() => {
        setIsMoving(false);
      }, 500);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [setIsMoving]);

  const handleMouseDown = () => {
    setIsMouseDown(true);
    gsap.to(cursorRef.current, {
      width: 50,
      height: 50,
      borderColor: "#25d366", // WhatsApp green
      boxShadow: "0 0 25px rgba(37, 211, 102, 0.5)",
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    gsap.to(cursorRef.current, {
      width: 25,
      height: 25,
      borderColor: "#ffffff",
      boxShadow: "none",
      duration: 0.2,
      ease: "power2.out"
    });
  };

  useEffect(() => {
    const updateTrail = () => {
      trailRefs.current.forEach((ref, index) => {
        if (ref.current) {
          const segment = ref.current;
          const delay = (index + 1) * 0.05;

          gsap.to(segment, {
            x: mousePosition.current.x,
            y: mousePosition.current.y,
            duration: 0.3,
            delay,
            opacity: isMoving || isMouseDown ? 1 - index / trailLength : 0,
            ease: "power2.out",
            scale: 1 + index / trailLength,
            boxShadow:
              isMoving || isMouseDown
                ? `0 0 10px rgba(37, 211, 102, ${0.2 + index / trailLength})`
                : "none"
          });
        }
      });
    };

    const animateTrail = () => {
      updateTrail();
      if (isMoving || isMouseDown) {
        animationFrameId.current = requestAnimationFrame(animateTrail);
      } else if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };

    animateTrail();
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [isMoving, isMouseDown]);

  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {trailRefs.current.map((ref, index) => (
        <div key={index} className="trail-segment" ref={ref}></div>
      ))}
      <div className="custom-cursor" ref={cursorRef}>
        <div className="cursor-dot" />
      </div>
    </>
  );
};

const socket = io();

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
  const blobRef = useRef(null);
  
  const [buttonText, setButtonText] = useState('View More');
  const [buttonUrl, setButtonUrl] = useState('https://www.google.com');
  const [messageTitle, setMessageTitle] = useState("Guru's Api");
  const [messageSubtitle, setMessageSubtitle] = useState('Subtitle Message');
  const [messageFooter, setMessageFooter] = useState('Guru Sensei');
  const [mediaUrl, setMediaUrl] = useState('');

  useEffect(() => {
    const blob = blobRef.current;
    
    const onPointerMove = (event) => {
      const { clientX, clientY } = event;
      
      setTimeout(() => {
        blob.animate({
          left: `${clientX}px`,
          top: `${clientY}px`
        }, { duration: 2000, fill: "forwards" });
      }, 100);
    };
    
    window.addEventListener('pointermove', onPointerMove);
    
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    
    const stars = [];
    const maxStars = 150;
    const maxDistance = 150; 
    
    for (let i = 0; i < maxStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      
      stars.forEach((star, i) => {
        star.x += star.vx;
        star.y += star.vy;
        
        if (star.x < 0 || star.x > canvas.width) star.vx = -star.vx;
        if (star.y < 0 || star.y > canvas.height) star.vy = -star.vy;
        
        ctx.moveTo(star.x, star.y);
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        
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
    
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  useEffect(() => {
    socket.on('status', (msg) => {
      setLogs(prev => [...prev, msg]);
    });

    socket.on('counts', (counts) => {
      setRealtimeStats(counts);
    });

    return () => {
      socket.off('status');
      socket.off('counts');
    };
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // Replace the handleSend function with this version that handles both types
  const handleSend = async () => {
    if (!numbersText || !message) return alert('Enter both numbers and message');
  
    setSending(true);
    setLogs(['🚀 Sending initiated...']);
    setSummary(null);
    setRealtimeStats(null);
  
    try {
      // Use different endpoints based on the active tab
      const endpoint = activeTab === 'simple-message' 
        ? '/pair/send-simple-messages' 
        : '/pair/send-messages';
      
      // Create the appropriate request body based on message type
      const requestBody = activeTab === 'simple-message'
        ? { numbersText, message }
        : { 
            numbersText, 
            message,
            buttonText,
            buttonUrl,
            messageTitle,
            messageSubtitle,
            messageFooter,
            mediaUrl // Include the mediaUrl in the request
          };
      
      const response = await axios.post(endpoint, requestBody);
      
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
        <h3>Send Interactive Messages</h3>
        
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
            rows="6"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        {/* Add media URL input */}
        <div className="input-group">
          <label>Media URL (Optional)</label>
          <div className="media-input-container">
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            {mediaUrl && (
              <div className="media-preview">
                <img 
                  src={mediaUrl} 
                  alt="Preview" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/100x100?text=Invalid+URL';
                  }}
                />
              </div>
            )}
          </div>
          <small className="input-note">Enter a direct URL to an image (JPG, PNG, etc.)</small>
        </div>
        
        <div className="button-settings glass-darker">
          <h4>Interactive Message Settings</h4>
          <div className="form-row">
            <div className="input-group">
              <label>Message Title</label>
              <input
                type="text"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                placeholder="Message Title"
              />
            </div>
            <div className="input-group">
              <label>Message Subtitle</label>
              <input
                type="text"
                value={messageSubtitle}
                onChange={(e) => setMessageSubtitle(e.target.value)}
                placeholder="Message Subtitle"
              />
            </div>
          </div>
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
              <label>Button URL</label>
              <input
                type="text"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="input-group">
            <label>Message Footer</label>
            <input
              type="text"
              value={messageFooter}
              onChange={(e) => setMessageFooter(e.target.value)}
              placeholder="Message Footer"
            />
          </div>
        </div>
        
        <button 
          className="send-button" 
          onClick={handleSend} 
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send Interactive Messages'}
        </button>
      </div>
    );
  };

  // Add this function to render the simple message sender
  const renderSimpleMessageSender = () => {
    return (
      <div className="content-area glass-dark">
        <h3>Send Simple Text Messages</h3>
        
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
            rows="6"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        <button 
          className="send-button" 
          onClick={handleSend} 
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send Simple Messages'}
        </button>
        
        <div className="glass-darker" style={{padding: '15px', marginTop: '20px'}}>
          <p style={{fontSize: '14px', color: '#ccc'}}>
            <strong>Note:</strong> Simple text messages are sent without buttons, titles, or other formatting elements.
            They're perfect for sending straightforward information that doesn't require interactive elements.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container dark-theme">
      {/* Custom cursor effect */}
      <CustomCursor />
      
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
        
        <div className={`content-wrapper ${!sidebarOpen ? 'full-width' : ''}`}>
          {activeTab === 'hydrated-button' && renderHydratedButtonSender()}
          {activeTab === 'simple-message' && renderSimpleMessageSender()}
          {activeTab === 'settings' && <div className="content-area glass-dark"><h3>Settings (Coming Soon)</h3></div>}
          
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