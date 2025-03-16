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

  useEffect(() => {
    socket.on('status', (msg) => {
      setLogs((prev) => [...prev, msg]);
    });

    return () => socket.off('status');
  }, []);

  const handleSend = async () => {
    if (!numbersText || !message) return alert('Enter both numbers and message');

    setSending(true);
    setLogs(['🚀 Sending initiated...']);

    try {
      await axios.post('/pair/send-messages', { numbersText, message });
    } catch (err) {
      setLogs((prev) => [...prev, '❌ Send request failed']);
    }

    setSending(false);
  };

  return (
    <div className="sender-container">
      <div className="sender-box">
        <h2>📤 Bulk Message Sender</h2>
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

        <div className="status-box">
          <h4>Status Console</h4>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <p key={i} style={{ margin: 0 }}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageSender;
