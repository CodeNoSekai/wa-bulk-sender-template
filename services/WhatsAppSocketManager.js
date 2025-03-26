import {
  makeWASocket,
  delay,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} from '@fizzxydev/baileys-pro';
import { useMongoDBAuthState } from '../utils/mongoauth.js'; 
import * as mongoStore from '../utils/store.js';
import mongoConnectionManager from '../utils/mongo-connection.js';
import pino from 'pino';
import NodeCache from 'node-cache'; 
import EventEmitter from 'events';
import dotenv from 'dotenv';
dotenv.config();

class WhatsAppSocketManager extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.msgRetryCounterCache = new NodeCache();
    this.authStateManager = null;
  }

  async initialize(number = '') {
    const dbName = process.env.MONGODB_DB_NAME || 'whatsapp_auth';
    
    const authState = await useMongoDBAuthState(undefined, dbName);
    this.authStateManager = authState;
    
    this.client = makeWASocket({
      auth: {
        creds: authState.state.creds,
        keys: makeCacheableSignalKeyStore(authState.state.keys, pino({ level: 'fatal' })),
      },
      printQRInTerminal: false,
      version: [ 2, 3000, 1015901307 ],
      logger: pino({ level: 'fatal' }),
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
      msgRetryCounterCache: this.msgRetryCounterCache,
      cachedGroupMetadata: async (jid) => {
        try {
          return await mongoStore.groupMetadata(jid);
        } catch (err) {
          console.error('Error fetching group metadata from MongoDB:', err);
          return null;
        }
      },
      getMessage: async key => {
        try {
          const jid = key.remoteJid ? jidNormalizedUser(key.remoteJid) : null;
          
          const msg = await mongoStore.loadMessage(key.id, jid);
          return msg?.message || '';
        } catch (err) {
          console.error('Error fetching message from MongoDB:', err);
          return '';
        }
      },
    });

    this.client.ev.on('messages.upsert', async (upsert) => {
      try {
        await mongoStore.saveMessages(upsert);
      } catch (err) {
        console.error('Error saving messages to MongoDB:', err);
      }
    });

    this.client.ev.on('contacts.update', async (contacts) => {
      try {
        for (const contact of contacts) {
          await mongoStore.saveContact(contact);
        }
      } catch (err) {
        console.error('Error saving contacts to MongoDB:', err);
      }
    });

    this.client.ev.on('message-receipt.update', async (updates) => {
      try {
        await mongoStore.saveReceipts(updates);
      } catch (err) {
        console.error('Error saving receipts to MongoDB:', err);
      }
    });

    this.client.ev.on('creds.update', authState.saveCreds);
    this._setupConnectionListeners();

    let pairingCode = null;
    if (!this.client.authState.creds.registered && number) {
      await delay(1500);
      const cleanNumber = number.replace(/[^0-9]/g, '');
      pairingCode = await this.client.requestPairingCode(cleanNumber, "GURU1234");
      console.log('🔐 Pairing Code:', pairingCode);
    }
    
    return pairingCode;
  }

  async disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
    
    try {
      await mongoConnectionManager.closeAllConnections();
    } catch (err) {
      console.error('Error closing MongoDB connections:', err);
    }
  }

  _setupConnectionListeners() {
    this.client.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect } = s;

      if (connection === 'open') {
        this.isConnected = true;
        console.log('✅ Socket connected.');
        this.emit('connection', { status: 'connected' });
      }

      if (connection === 'close') {
        this.isConnected = false;
        const reason = lastDisconnect?.error?.message || '';
        console.log(`⚠ Socket disconnected: ${reason}`);
        this.emit('connection', { status: 'disconnected', reason });

        if (!reason.includes('logged out')) {
          console.log('🔁 Reinitializing socket in 5s...');
          
          try {
            console.log('📤 Closing MongoDB connections before reconnect...');
            await mongoConnectionManager.closeAllConnections();
          } catch (err) {
            console.error('Error closing MongoDB connections:', err);
          }
          
          await delay(5000);
          
          if (reason.includes('Stream Errored')) {
            console.log('🔄 Performing clean reconnection for Stream Error...');
            await this.disconnect();
            await this.initialize(); 
          } else {
            await this.initialize();
          }
        }
      }
    });
  }

  async requestPairingCode(number) {
    if (!this.client) throw new Error('Socket not initialized');
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const code = await this.client.requestPairingCode(cleanNumber, "GURUAI69");
    console.log('🔐 Pairing Code:', code);
    return code;
  }

  isInitialized() {
    return !!this.client;
  }

  isPaired() {
    return this.client?.authState?.creds?.registered;
  }

  getClient() {
    return this.client;
  }

  getConnectionStatus() {
    return {
      initialized: this.isInitialized(),
      connected: this.isConnected,
      paired: this.isPaired()
    };
  }
}

const socketManager = new WhatsAppSocketManager();
export default socketManager;