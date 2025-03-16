import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import MessageSender from './components/MessageSender';

const App = () => {
  const [connected, setConnected] = useState(false);
  return connected ? <MessageSender /> : <LoginPage onConnected={() => setConnected(true)} />;
};

export default App;
