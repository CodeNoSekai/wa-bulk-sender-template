import { delay } from '@fizzxydev/baileys-pro';
import socketManager from './WhatsAppSocketManager.js';

class MessageService {
  constructor(io) {
    this.io = io;
  }

  async sendBatch(numbersText, messageConfig, messageType = 'standard') {
    const client = socketManager.getClient();
    if (!client || !socketManager.isConnected) {
      throw new Error('Socket is not connected. Please pair first.');
    }

    const lines = numbersText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const jids = lines.map(num => `${num}@s.whatsapp.net`);

    this.io.emit('status', `📤 Message sending started to ${jids.length} numbers.`);
    this.io.emit('counts', { total: jids.length, successful: 0, failed: 0 });

    let successCount = 0;
    let failureCount = 0;

    try {
      for (let jid of jids) {
        try {
          let messageObject;
          
          switch(messageType) {
            case 'simple':
              messageObject = { text: messageConfig.message };
              break;
            case 'shop':
              messageObject = this._createShopMessage(messageConfig);
              break;
            default:
              messageObject = this._createStandardMessage(messageConfig);
          }

          this.io.emit('status', `Sending ${messageType} message to ${jid}...`);
          await client.sendMessage(jid, messageObject);
          
          successCount++;
          this.io.emit('status', `✅ Message sent to ${jid}`);
        } catch (err) {
          failureCount++;
          this.io.emit('status', `❌ Failed to send to ${jid}: ${err.message}`);
        }
        
        this.io.emit('counts', { 
          total: jids.length, 
          successful: successCount, 
          failed: failureCount 
        });
        
        await delay(10000); // Delay between messages 10s
      }

      return {
        status: 'Sending completed',
        summary: {
          total: jids.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (err) {
      throw new Error(`Sending error: ${err.message}`);
    }
  }

  _createStandardMessage(config) {
    const { 
      message, 
      messageTitle = "Guru's Api",
      messageSubtitle = "Subtitle Message",
      messageFooter = "Guru Sensei",
      buttonText = "Display Button", 
      buttonUrl = "https://github.com/Guru322",
      mediaUrl = ""
    } = config;

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

    if (mediaUrl && mediaUrl.trim() !== '') {
      messageObject = {
        ...messageObject,
        image: { url: mediaUrl },
        caption: message,
        media: true
      };
    }

    return messageObject;
  }

  _createShopMessage(config) {
    const { 
      message,
      messageTitle = "Shop Title",
      messageSubtitle = "Shop Subtitle",
      messageFooter = "Shop Footer",
      mediaUrl,
      shopName = "WA",
      shopId = "default_shop_id",
      viewOnce = true
    } = config;

    return {
      image: { url: mediaUrl },
      caption: message,
      title: messageTitle,
      subtitle: messageSubtitle,
      footer: messageFooter,
      media: true,
      viewOnce: viewOnce,
      shop: shopName,
      id: shopId
    };
  }
}

export default MessageService;