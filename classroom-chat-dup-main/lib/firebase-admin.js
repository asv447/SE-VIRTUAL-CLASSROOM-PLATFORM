// lib/firebase-admin.js
import admin from 'firebase-admin';

let db; 

if (!admin.apps.length) {
  console.log("--- FIREBASE: Initializing Admin SDK...");
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    console.log("--- FIREBASE: Admin SDK Initialized Successfully.");
    db = admin.firestore(); 

  } catch (error) {
    console.error('--- FIREBASE INIT ERROR:', error);
  }
} else {
  console.log("--- FIREBASE: Admin SDK already initialized.");
  db = admin.firestore(); 
}

export { db };
