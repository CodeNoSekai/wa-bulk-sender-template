
/**
 * MongoDB Store
 * 
 * This implementation stores WhatsApp messages, contacts, and other data in MongoDB.
 * 
 * Credits:
 * Portions of this code were based on:
 * https://github.com/AstroX11/Xstro/blob/master/src/model/store.mts
 * 
 * Original author: AstroX11
 * Modified and adapted for this project.
 */

import mongoConnectionManager from './mongo-connection.js';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';

dotenv.config();

const dbName = 'whatsapp_store';

async function getDb() {
  return mongoConnectionManager.getDb(dbName);
}

async function ContactStore() {
  const database = await getDb();
  
  await database.collection('contacts').createIndex({ jid: 1 }, { unique: true });
}

export async function groupMetadata(jid) {
  const database = await getDb();
  const groupMetadataCollection = database.collection('group_metadata');
  const result = await groupMetadataCollection.findOne({ jid });
  return result?.metadata;
}

export async function saveMessages(upsert) {
  const database = await getDb();
  const messagesCollection = database.collection('messages');

  try {
    const indexes = await messagesCollection.indexes();
    const uniqueIndexes = indexes.filter(idx => 
      idx.unique === true && 
      idx.key && 
      idx.key['key.remoteJid'] && 
      idx.key['key.id'] && 
      idx.key['key.fromMe']
    );
    
    for (const idx of uniqueIndexes) {
      await messagesCollection.dropIndex(idx.name);
      console.log(`Dropped problematic index: ${idx.name}`);
    }
    
    await messagesCollection.createIndex({ 'key.remoteJid': 1 });
    await messagesCollection.createIndex({ 'key.id': 1 });
  } catch (err) {
    console.error('Error managing indexes:', err);
  }

  const validMessages = upsert.messages.filter(message => 
    message.key && (message.key.id || message.key.remoteJid)
  );

  const operations = validMessages.map((message) => {
    const timestamp =
      typeof message.messageTimestamp === 'number' ? message.messageTimestamp : Date.now();
    
    let filter = {};
    
    if (message.key.id && message.key.remoteJid) {
      filter = {
        'key.id': message.key.id,
        'key.remoteJid': message.key.remoteJid,
        'key.fromMe': message.key.fromMe ?? false
      };
    } else {
      filter = { _id: new ObjectId() };
    }
    
    return {
      updateOne: {
        filter: filter,
        update: {
          $set: {
            'key.remoteJid': message.key.remoteJid ?? null,
            'key.id': message.key.id ?? null,
            'key.fromMe': message.key.fromMe ?? false,
            participant: message.participant ?? null,
            messageTimestamp: timestamp,
            status: message.status ?? null,
            data: message,
            requestId: upsert.requestId ?? null,
            upsertType: upsert.type,
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    try {
      await messagesCollection.bulkWrite(operations);
    } catch (error) {
      console.error('Error details:', error.message);
      
      console.log('Attempting to save messages individually with unique IDs...');
      for (const message of validMessages) {
        try {
          const timestamp = typeof message.messageTimestamp === 'number' 
            ? message.messageTimestamp : Date.now();
          
          await messagesCollection.updateOne(
            { _id: new ObjectId() }, 
            {
              $set: {
                'key.remoteJid': message.key.remoteJid ?? null,
                'key.id': message.key.id ?? null,
                'key.fromMe': message.key.fromMe ?? false,
                participant: message.participant ?? null,
                messageTimestamp: timestamp,
                status: message.status ?? null,
                data: message,
                requestId: upsert.requestId ?? null,
                upsertType: upsert.type,
              },
            },
            { upsert: true }
          );
        } catch (innerError) {
          console.error('Could not save individual message:', innerError.message);
        }
      }
    }
  }
}

export async function loadMessage(id, jid = null) {
  const database = await getDb();
  const messagesCollection = database.collection('messages');
  
  const query = { 'key.id': id };
  if (jid) {
    query['key.remoteJid'] = jid;
  }
  
  const message = await messagesCollection.findOne(query);
  return message ? message.data : null;
}

export async function saveContact(contact) {
  await ContactStore();
  const database = await getDb();
  const contactsCollection = database.collection('contacts');

  await contactsCollection.updateOne(
    { jid: contact.jid },
    {
      $set: {
        pushName: contact.pushName ?? null,
        verifiedName: contact.verifiedName ?? null,
        lid: contact.lid ?? null,
        bio: contact.bio ?? null,
      },
    },
    { upsert: true }
  );
}

export async function saveReceipts(updates) {
  const database = await getDb();
  const receiptsCollection = database.collection('message_receipts');

  try {
    const indexes = await receiptsCollection.indexes();
    const uniqueIndexes = indexes.filter(idx => 
      idx.unique === true && 
      idx.key && 
      idx.key['key.remoteJid'] && 
      idx.key['key.id'] && 
      idx.key['key.fromMe']
    );
    
    for (const idx of uniqueIndexes) {
      await receiptsCollection.dropIndex(idx.name);
    }
    
    await receiptsCollection.createIndex({ 'key.remoteJid': 1 });
    await receiptsCollection.createIndex({ 'key.id': 1 });
  } catch (err) {
    console.error('Error managing receipt indexes:', err);
  }

  const validUpdates = updates.filter(update => 
    update.key && (update.key.id || update.key.remoteJid)
  );

  const operations = validUpdates.map((update) => {
    const { key, receipt } = update;
    
    const filter = {};
    
    if (key.remoteJid) {
      filter['key.remoteJid'] = key.remoteJid;
    }
    
    if (key.id) {
      filter['key.id'] = key.id;
    }
    
    if (Object.keys(filter).length > 0) {
      filter['key.fromMe'] = key.fromMe ?? false;
    } else {
      filter['_id'] = new ObjectId();
    }
    
    return {
      updateOne: {
        filter: filter,
        update: {
          $set: {
            'key.remoteJid': key.remoteJid ?? null,
            'key.id': key.id ?? null,
            'key.fromMe': key.fromMe ?? false,
            receipt
          }
        },
        upsert: true
      }
    };
  });

  if (operations.length > 0) {
    try {
      await receiptsCollection.bulkWrite(operations);
    } catch (error) {
      console.error('Receipt save error:', error.message);
    }
  }
}