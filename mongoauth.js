import { MongoClient, ObjectId } from 'mongodb';
import { initAuthCreds } from '@fizzxydev/baileys-pro';
import { proto } from '@fizzxydev/baileys-pro';

/**
 * Stores Baileys authentication state in MongoDB
 * @param {string} uri MongoDB connection URI
 * @param {string} dbName Database name
 * @returns {Promise<{state: AuthenticationState, saveCreds: () => Promise<void>}>}
 */
export const useMongoDBAuthState = async (uri, dbName = 'baileys') => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  const credsCollection = db.collection('credentials');
  const keysCollection = db.collection('keys');
  
  let creds = await credsCollection.findOne({ _id: 'credentials' });
  if (!creds) {
    creds = initAuthCreds();
  } else {
    delete creds._id;
  }
  
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          
          const keys = await keysCollection.find({
            type,
            id: { $in: ids }
          }).toArray();
          
          for (const key of keys) {
            let value = key.value;
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[key.id] = value;
          }
          
          return data;
        },
        set: async (data) => {
          const operations = [];
          
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              
              if (value) {
                operations.push({
                  updateOne: {
                    filter: { type: category, id },
                    update: { $set: { type: category, id, value } },
                    upsert: true
                  }
                });
              } else {
                operations.push({
                  deleteOne: {
                    filter: { type: category, id }
                  }
                });
              }
            }
          }
          
          if (operations.length > 0) {
            await keysCollection.bulkWrite(operations);
          }
        }
      }
    },
    saveCreds: async () => {
      await credsCollection.updateOne(
        { _id: 'credentials' },
        { $set: { ...creds, _id: 'credentials' } },
        { upsert: true }
      );
    }
  };
};
