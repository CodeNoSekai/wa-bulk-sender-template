import React, { useState } from 'react';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = ({ onConnected }) => {
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (!cleanNumber) return;

    setLoading(true);
    try {
      const { data } = await axios.get(`/pair?number=${cleanNumber}`);
      if (data.code) {
        setPairingCode(data.code);
        setShowPopup(true);
      } else {
        setPairingCode(data.message || 'No code returned');
        setShowPopup(true);
        setSuccess(true);
        onConnected();
      }
    } catch (err) {
      alert('Error initiating connection');
    }
    setLoading(false);
  };

  const closePopup = () => {
    setShowPopup(false);
    if (success) onConnected();
  };

  return (
    <div className="login-container">
      <div className="glass-box">
        <h2>Link Your WhatsApp</h2>
        <input
          type="text"
          placeholder="Enter phone number with country code"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Connecting...' : 'Submit'}
        </button>
      </div>

      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h3>Pairing {success ? 'Success' : 'Code'}</h3>
            <p>{pairingCode}</p>
            <button onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
