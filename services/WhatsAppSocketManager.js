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
    this.clients = new Map(); 
    this.isConnected = new Map(); 
    this.msgRetryCounterCaches = new Map(); 
    this.authStateManagers = new Map(); 
  }

  async initialize(number = '', userDbName = '') {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const dbName = userDbName || process.env.MONGODB_DB_NAME || `wa_${sanitizedNumber}`;
    
    if (this.clients.has(sanitizedNumber)) {
      return this.isPaired(sanitizedNumber) ? null : await this.requestPairingCode(sanitizedNumber);
    }
    
    this.msgRetryCounterCaches.set(sanitizedNumber, new NodeCache());
    const msgRetryCounterCache = this.msgRetryCounterCaches.get(sanitizedNumber);
    
    const authState = await useMongoDBAuthState(undefined, dbName);
    this.authStateManagers.set(sanitizedNumber, authState);
    
    const client = makeWASocket({
      auth: {
        creds: authState.state.creds,
        keys: makeCacheableSignalKeyStore(authState.state.keys, pino({ level: 'fatal' })),
      },
      printQRInTerminal: false,
      version: [ 2, 3000, 1015901307 ],
      logger: pino({ level: 'fatal' }),
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
      msgRetryCounterCache,
      cachedGroupMetadata: async (jid) => {
        try {
          return await mongoStore.groupMetadata(jid, dbName);
        } catch (err) {
          console.error(`Error fetching group metadata from MongoDB for ${sanitizedNumber}:`, err);
          return null;
        }
      },
      getMessage: async key => {
        try {
          const jid = key.remoteJid ? jidNormalizedUser(key.remoteJid) : null;
          
          const msg = await mongoStore.loadMessage(key.id, jid, dbName);
          return msg?.message || '';
        } catch (err) {
          console.error(`Error fetching message from MongoDB for ${sanitizedNumber}:`, err);
          return '';
        }
      },
    });

    this.clients.set(sanitizedNumber, client);
    this.isConnected.set(sanitizedNumber, false);

    client.ev.on('messages.upsert', async (upsert) => {
      try {
        await mongoStore.saveMessages(upsert, dbName);
      } catch (err) {
        console.error(`Error saving messages to MongoDB for ${sanitizedNumber}:`, err);
      }
    });

    client.ev.on('contacts.update', async (contacts) => {
      try {
        for (const contact of contacts) {
          await mongoStore.saveContact(contact, dbName);
        }
      } catch (err) {
        console.error(`Error saving contacts to MongoDB for ${sanitizedNumber}:`, err);
      }
    });

    client.ev.on('message-receipt.update', async (updates) => {
      try {
        await mongoStore.saveReceipts(updates, dbName);
      } catch (err) {
        console.error(`Error saving receipts to MongoDB for ${sanitizedNumber}:`, err);
      }
    });

    client.ev.on('creds.update', authState.saveCreds);
    this._setupConnectionListeners(sanitizedNumber);

    let pairingCode = null;
    if (!client.authState.creds.registered && sanitizedNumber) {
      await delay(1500);
      pairingCode = await client.requestPairingCode(sanitizedNumber, "GURUAI69");
      console.log(`🔐 Pairing Code for ${sanitizedNumber}:`, pairingCode);
    }
    
    return pairingCode;
  }

  async disconnect(number) {
    const sanitizedNumber = number ? number.replace(/[^0-9]/g, '') : null;
    
    if (sanitizedNumber) {
      const client = this.clients.get(sanitizedNumber);
      if (client) {
        await client.end();
        this.clients.delete(sanitizedNumber);
        this.isConnected.delete(sanitizedNumber);
        this.msgRetryCounterCaches.delete(sanitizedNumber);
        
        const authState = this.authStateManagers.get(sanitizedNumber);
        if (authState && authState.closeConnection) {
          await authState.closeConnection();
        }
        this.authStateManagers.delete(sanitizedNumber);
      }
    } else {
      for (const [num, client] of this.clients.entries()) {
        if (client) {
          await client.end();
        }
      }
      
      this.clients.clear();
      this.isConnected.clear();
      this.msgRetryCounterCaches.clear();
      
      for (const authState of this.authStateManagers.values()) {
        if (authState && authState.closeConnection) {
          await authState.closeConnection();
        }
      }
      this.authStateManagers.clear();
    }
    
    try {
      if (!sanitizedNumber) {
        await mongoConnectionManager.closeAllConnections();
      }
    } catch (err) {
      console.error('Error closing MongoDB connections:', err);
    }
  }

  _setupConnectionListeners(number) {
    const client = this.clients.get(number);
    
    if (!client) return;

    client.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect } = s;

      if (connection === 'open') {
        this.isConnected.set(number, true);
        console.log(`✅ Socket connected for ${number}.`);
        this.emit('connection', { status: 'connected', number });
      }

      if (connection === 'close') {
        this.isConnected.set(number, false);
        const reason = lastDisconnect?.error?.message || '';
        console.log(`⚠ Socket disconnected for ${number}: ${reason}`);
        this.emit('connection', { status: 'disconnected', reason, number });

        if (!reason.includes('logged out')) {
          console.log(`🔁 Reinitializing socket for ${number} in 5s...`);
          
          try {
            console.log(`📤 Closing MongoDB connections for ${number} before reconnect...`);
          } catch (err) {
            console.error(`Error closing MongoDB connections for ${number}:`, err);
          }
          
          await delay(5000);
          
          if (reason.includes('Stream Errored')) {
            console.log(`🔄 Performing clean reconnection for Stream Error on ${number}...`);
            await this.disconnect(number);
            await this.initialize(number); 
          } else {
            await this.initialize(number);
          }
        }
      }
    });
  }

  async requestPairingCode(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const client = this.clients.get(sanitizedNumber);
    
    if (!client) {
      throw new Error('Socket not initialized for this number');
    }
    
    const code = await client.requestPairingCode(sanitizedNumber, "GURUAI69");
    console.log(`🔐 Pairing Code for ${sanitizedNumber}:`, code);
    return code;
  }

  isInitialized(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    return this.clients.has(sanitizedNumber);
  }

  isPaired(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const client = this.clients.get(sanitizedNumber);
    return client?.authState?.creds?.registered;
  }

  getClient(number) {
    const sanitizedNumber = number ? number.replace(/[^0-9]/g, '') : null;
    return sanitizedNumber ? this.clients.get(sanitizedNumber) : null;
  }

  getConnectionStatus(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    return {
      initialized: this.isInitialized(sanitizedNumber),
      connected: this.isConnected.get(sanitizedNumber) || false,
      paired: this.isPaired(sanitizedNumber)
    };
  }
  
  getAllNumbers() {
    return Array.from(this.clients.keys());
  }
}

const socketManager = new WhatsAppSocketManager();
export default socketManager;
