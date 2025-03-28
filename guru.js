import express from 'express';
import fs from 'fs';
import { exec } from 'child_process';
import socketManager from './services/WhatsAppSocketManager.js';
import MessageService from './services/MessageService.js';
import userManager from './utils/user-manager.js';

const router = express.Router();

router.get('/numbers', async (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: 'User ID is required' });

  try {
    const numbers = await userManager.getUserNumbers(uid);
    return res.json({ numbers });
  } catch (err) {
    console.error('Error fetching user numbers:', err);
    return res.status(500).json({ error: 'Failed to fetch user numbers' });
  }
});

router.post('/register-number', async (req, res) => {
  const { uid, number } = req.body;
  if (!uid || !number) return res.status(400).json({ error: 'User ID and phone number are required' });

  try {
    const result = await userManager.registerNumber(uid, number);
    await userManager.setActiveNumber(uid, number);
    return res.json(result);
  } catch (err) {
    console.error('Error registering number:', err);
    return res.status(500).json({ error: 'Failed to register number' });
  }
});

router.post('/set-active-number', async (req, res) => {
  const { uid, number } = req.body;
  if (!uid || !number) return res.status(400).json({ error: 'User ID and phone number are required' });

  try {
    const result = await userManager.setActiveNumber(uid, number);
    return res.json(result);
  } catch (err) {
    console.error('Error setting active number:', err);
    return res.status(500).json({ error: 'Failed to set active number' });
  }
});

router.post('/remove-number', async (req, res) => {
  const { uid, number } = req.body;
  if (!uid || !number) return res.status(400).json({ error: 'User ID and phone number are required' });

  try {
    await userManager.removeNumber(uid, number);
    //await socketManager.disconnect(number);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error removing number:', err);
    return res.status(500).json({ error: 'Failed to remove number' });
  }
});

// ====== Pairing Route ======
router.get('/', async (req, res) => {
  const number = req.query.number;
  const uid = req.query.uid;
  
  if (!number || !uid) return res.status(400).json({ error: 'Phone number and user ID are required' });

  try {
    const userNumber = await userManager.registerNumber(uid, number);
    const dbName = userNumber.dbName;
    
    if (!socketManager.isInitialized(number)) {
      const code = await socketManager.initialize(number, dbName);
      if (code) return res.json({ code });
      return res.json({ message: 'Already paired' });
    }

    if (!socketManager.isPaired(number)) {
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
  const { uid } = req.body;

  if (!uid) return res.status(400).json({ error: 'User ID is required' });

  try {
    const activeNumber = await userManager.getActiveNumber(uid);
    if (!activeNumber) {
      return res.status(400).json({ error: 'No active WhatsApp number found for this user' });
    }

    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'standard',
      activeNumber.number
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/send-simple-messages', async (req, res) => {
  const io = req.app.get('io');
  const messageService = new MessageService(io);
  const { uid } = req.body;

  if (!uid) return res.status(400).json({ error: 'User ID is required' });

  try {
    const activeNumber = await userManager.getActiveNumber(uid);
    if (!activeNumber) {
      return res.status(400).json({ error: 'No active WhatsApp number found for this user' });
    }

    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'simple',
      activeNumber.number
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/send-shop-messages', async (req, res) => {
  const io = req.app.get('io');
  const messageService = new MessageService(io);
  const { uid } = req.body;
  
  if (!uid) return res.status(400).json({ error: 'User ID is required' });
  if (!req.body.mediaUrl) {
    return res.status(400).json({ error: 'Missing required mediaUrl for shop messages' });
  }

  try {
    const activeNumber = await userManager.getActiveNumber(uid);
    if (!activeNumber) {
      return res.status(400).json({ error: 'No active WhatsApp number found for this user' });
    }

    const result = await messageService.sendBatch(
      req.body.numbersText, 
      req.body, 
      'shop',
      activeNumber.number
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  const { number } = req.query;
  
  if (!number) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const status = socketManager.getConnectionStatus(number);
    return res.json(status);
  } catch (err) {
    console.error('Error getting connection status:', err);
    return res.status(500).json({ error: 'Failed to get connection status' });
  }
});

export default router;
