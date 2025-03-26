import express from 'express';
import fs from 'fs';
import { exec } from 'child_process';
import socketManager from './services/WhatsAppSocketManager.js';
import MessageService from './services/MessageService.js';

const router = express.Router();

// ====== Pairing Route ======
router.get('/', async (req, res) => {
  const number = req.query.number;
  if (!number) return res.status(400).json({ error: 'Phone number is required' });

  try {
    if (!socketManager.isInitialized()) {
      const code = await socketManager.initialize(number);
      if (code) return res.json({ code });
      return res.json({ message: 'Already paired' });
    }

    if (!socketManager.isPaired()) {
      const code = await socketManager.requestPairingCode(number);
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
  const io = req.app.get('io');
  const messageService = new MessageService(io);

  try {
    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'standard'
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/send-simple-messages', async (req, res) => {
  const io = req.app.get('io');
  const messageService = new MessageService(io);

  try {
    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'simple'
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/send-shop-messages', async (req, res) => {
  const io = req.app.get('io');
  const messageService = new MessageService(io);
  
  if (!req.body.mediaUrl) {
    return res.status(400).json({ error: 'Missing required mediaUrl for shop messages' });
  }

  try {
    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'shop'
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


export default router;
