import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp;
try {
  firebaseApp = admin.app();
} catch (e) {
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(__dirname, '..', 'firebase-service-account.json'),
    path.join(__dirname, '..', 'config', 'firebase-service-account.json'),
    '/workspaces/wa-bulk-sender-template/firebase-service-account.json'
  ].filter(Boolean); 
  
  let serviceAccount = null;
  
  for (const potentialPath of possiblePaths) {
    try {
      console.log(`Trying to load service account from: ${potentialPath}`);
      if (fs.existsSync(potentialPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(potentialPath, 'utf8'));
        console.log(`Successfully loaded service account from ${potentialPath}`);
        break;
      }
    } catch (err) {
      console.error(`Failed to load from ${potentialPath}: ${err.message}`);
    }
  }
  
  if (serviceAccount) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully with service account file');
  } else {
    console.warn('No service account file found, falling back to environment variables');
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
}

const db = admin.firestore();

class UserManager {
  constructor() {
    this.usersCollection = db.collection('whatsapp_users');
  }
  
  async registerNumber(uid, number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const dbName = `wa_${sanitizedNumber}`;
    
    const userDoc = this.usersCollection.doc(uid);
    const userSnapshot = await userDoc.get();
    
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      const existingNumbers = userData.numbers || [];
      const numberExists = existingNumbers.some(n => n.number === sanitizedNumber);
      
      if (!numberExists) {
        await userDoc.update({
          numbers: admin.firestore.FieldValue.arrayUnion({
            number: sanitizedNumber,
            dbName,
            isActive: false,
            createdAt: admin.firestore.Timestamp.now()
          })
        });
      }
    } else {
      await userDoc.set({
        numbers: [{
          number: sanitizedNumber,
          dbName,
          isActive: false,
          createdAt: admin.firestore.Timestamp.now()
        }]
      });
    }
    
    return { number: sanitizedNumber, dbName };
  }
  
  async getUserNumbers(uid) {
    const userDoc = this.usersCollection.doc(uid);
    const userSnapshot = await userDoc.get();
    
    if (userSnapshot.exists) {
      return userSnapshot.data().numbers || [];
    }
    return [];
  }
  
  async setActiveNumber(uid, number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const userDoc = this.usersCollection.doc(uid);
    const userSnapshot = await userDoc.get();
    
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      const updatedNumbers = userData.numbers.map(num => ({
        ...num,
        isActive: num.number === sanitizedNumber
      }));
      
      await userDoc.update({ numbers: updatedNumbers });
      
      return updatedNumbers.find(n => n.number === sanitizedNumber) || null;
    }
    return null;
  }
  
  async getActiveNumber(uid) {
    const userDoc = this.usersCollection.doc(uid);
    const userSnapshot = await userDoc.get();
    
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      return userData.numbers.find(n => n.isActive) || null;
    }
    return null;
  }
  
  async removeNumber(uid, number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const userDoc = this.usersCollection.doc(uid);
    const userSnapshot = await userDoc.get();
    
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();
      const numberToRemove = userData.numbers.find(n => n.number === sanitizedNumber);
      
      if (numberToRemove) {
        await userDoc.update({
          numbers: admin.firestore.FieldValue.arrayRemove(numberToRemove)
        });
      }
    }
  }
}

const userManager = new UserManager();
export default userManager;