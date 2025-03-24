import {
  makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@fizzxydev/baileys-pro';
import pino from 'pino';
import NodeCache from 'node-cache';
import EventEmitter from 'events';

class WhatsAppSocketManager extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.msgRetryCounterCache = new NodeCache();
    this.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
  }

  async initialize(number = '') {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    this.client = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
      },
      printQRInTerminal: false,
      logger: pino({ level: 'fatal' }),
      browser: Browsers.macOS('Safari'),
      markOnlineOnConnect: true,
      msgRetryCounterCache: this.msgRetryCounterCache,
      cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
    });

    this.client.ev.on('creds.update', saveCreds);
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
          await delay(5000);
          this.initialize();
        }
      }
    });
  }

  async requestPairingCode(number) {
    if (!this.client) throw new Error('Socket not initialized');
    
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const code = await this.client.requestPairingCode(cleanNumber);
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