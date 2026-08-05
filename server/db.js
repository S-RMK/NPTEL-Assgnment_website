const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let serviceAccount = null;
const keyPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  if (fs.existsSync(keyPath)) {
    serviceAccount = require(keyPath);
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 50) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }

  if (serviceAccount && serviceAccount.private_key) {
    // Replace escaped \n and any form feed \f characters with real newlines
    let formattedKey = serviceAccount.private_key;
    if (typeof formattedKey === 'string') {
      formattedKey = formattedKey.replace(/\\n/g, '\n').replace(/\f/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          ...serviceAccount,
          private_key: formattedKey
        })
      });
    }
    console.log('Firebase Admin Initialized Successfully');
  } else {
    console.warn('⚠️  Firebase Admin credentials not found.');
  }
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase Admin initialization error:', error.message);
  }
}

const db = (() => {
  try {
    return admin.apps.length ? admin.firestore() : null;
  } catch (e) {
    return null;
  }
})();

module.exports = db;
