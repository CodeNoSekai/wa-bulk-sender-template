import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Listen for status updates
    socket.on('status', (msg) => {
      setLogs((prev) => [...prev, msg]);
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

  const handleSend = async () => {
    if (!numbersText || !message) return alert('Enter both numbers and message');

    setSending(true);
    setLogs(['🚀 Sending initiated...']);
    setSummary(null);
    setRealtimeStats(null);

    try {
      const response = await axios.post('/pair/send-messages', { numbersText, message });
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

  return (
    <div className="sender-container">
      <div className="sender-box">
        <h2>📤Guru's Whatsapp Api</h2>
        <textarea
          placeholder="Enter numbers (one per line)"
          rows="7"
          value={numbersText}
          onChange={(e) => setNumbersText(e.target.value)}
        />
        <textarea
          placeholder="Your message here..."
          rows="4"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
    
        {/* Real-time stats during sending */}
        {sending && realtimeStats && (
          <div className="summary-box realtime">
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
          <div className="summary-box">
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
    
        <div className="status-box">
          <h4>Status Console</h4>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <p key={i} style={{ margin: 0 }}>{log}</p>
            ))}
          </div>
        </div>
    
        <footer className="footer-text">
          Built with ❤️ by GURU
        </footer>
      </div>
    </div>
  );  
}  

export default MessageSender;