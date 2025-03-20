import express from 'express';
import fs from 'fs';
import { exec } from 'child_process';
import pino from 'pino';
import NodeCache from 'node-cache';
import {
  makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} from '@fizzxydev/baileys-pro';

const router = express.Router();

let client = null;
let isConnected = false;
let msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })


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
    markOnlineOnConnect: true,
    msgRetryCounterCache,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
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
    const code = await client.requestPairingCode(number,"GURU1234");
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
  const { 
    numbersText, 
    message, 
    buttonText = "Display Button", 
    buttonUrl = "https://www.google.com",
    messageTitle = "Guru's Api",
    messageSubtitle = "Subtitle Message",
    messageFooter = "Guru Sensei",
    mediaUrl = "" // Add this line to accept media URL
  } = req.body;
  
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
        var result = await eval(code);
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
  io.emit('counts', { total: jids.length, successful: 0, failed: 0 });

  let successCount = 0;
  let failureCount = 0;

  try {
    for (let jid of jids) {
      try {
        // Create message object based on whether mediaUrl is provided
        let messageObject = {
          text: message,
          title: messageTitle,
          subtitle: messageSubtitle,
          footer: messageFooter,
          interactiveButtons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: buttonText,
                url: buttonUrl
              })
            }
          ]
        };

        // If mediaUrl is provided, convert to media message
        if (mediaUrl && mediaUrl.trim() !== '') {
          // Replace text with caption
          messageObject = {
            image: { url: mediaUrl },
            caption: message,
            title: messageTitle,
            subtitle: messageSubtitle,
            footer: messageFooter,
            media: true,
            interactiveButtons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: buttonText,
                  url: buttonUrl
                })
              }
            ]
          };
          io.emit('status', `📷 Sending media message to ${jid}...`);
        }

        await client.sendMessage(jid, messageObject);
        successCount++;
        io.emit('status', `✅ Message sent to ${jid}`);
        io.emit('counts', { total: jids.length, successful: successCount, failed: failureCount });
      } catch (err) {
        failureCount++;
        io.emit('status', `❌ Failed to send to ${jid}: ${err.message}`);
        io.emit('counts', { total: jids.length, successful: successCount, failed: failureCount });
      }
      await delay(30000);
    }

    io.emit('status', `✅ All messages processed. Successful: ${successCount}, Failed: ${failureCount}`);
    return res.json({ 
      status: 'Sending completed', 
      summary: {
        total: jids.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (err) {
    io.emit('status', `❌ Sending failed: ${err.message}. Successful: ${successCount}, Failed: ${failureCount}`);
    return res.status(500).json({ 
      error: 'Sending error',
      summary: {
        total: jids.length,
        successful: successCount,
        failed: failureCount
      }
    });
  }
});

router.post('/send-simple-messages', async (req, res) => {
  const { 
    numbersText, 
    message
  } = req.body;
  
  const io = req.app.get('io');

  if (!numbersText || !message) {
    return res.status(400).json({ error: 'Missing numbersText or message' });
  }

  if (!client || !isConnected) {
    return res.status(500).json({ error: 'Socket is not connected. Please pair first.' });
  }

  const lines = numbersText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const jids = lines.map(num => `${num}@s.whatsapp.net`);

  io.emit('status', `📤 Sending simple messages to ${jids.length} numbers.`);
  io.emit('counts', { total: jids.length, successful: 0, failed: 0 });

  let successCount = 0;
  let failureCount = 0;

  try {
    for (let jid of jids) {
      try {
        await client.sendMessage(
          jid,
          { text: message }
        );
        successCount++;
        io.emit('status', `✅ Simple message sent to ${jid}`);
        io.emit('counts', { total: jids.length, successful: successCount, failed: failureCount });
      } catch (err) {
        failureCount++;
        io.emit('status', `❌ Failed to send to ${jid}: ${err.message}`);
        io.emit('counts', { total: jids.length, successful: successCount, failed: failureCount });
      }
      await delay(30000);
    }

    io.emit('status', `✅ All simple messages processed. Successful: ${successCount}, Failed: ${failureCount}`);
    return res.json({ 
      status: 'Sending completed', 
      summary: {
        total: jids.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (err) {
    io.emit('status', `❌ Sending failed: ${err.message}. Successful: ${successCount}, Failed: ${failureCount}`);
    return res.status(500).json({ 
      error: 'Sending error',
      summary: {
        total: jids.length,
        successful: successCount,
        failed: failureCount
      }
    });
  }
});

export default router;
