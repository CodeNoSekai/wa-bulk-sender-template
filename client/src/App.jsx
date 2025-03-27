import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import MessageSender from './components/MessageSender';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGitHubLogin = (user) => {
    setUser(user);
  };

  const handleWhatsAppConnected = () => {
    setWhatsappConnected(true);
  };
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setWhatsappConnected(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleGitHubLogin} />;
  } else if (!whatsappConnected) {
    return <LoginPage onConnected={handleWhatsAppConnected} />;
  } else {
    return <MessageSender onLogout={handleLogout} />;
  }
};

export default App;
