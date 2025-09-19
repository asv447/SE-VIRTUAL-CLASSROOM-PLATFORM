import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const isFirebaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  )
}

let app = null
let auth = null
let db = null

if (isFirebaseConfigured()) {
  const firebaseConfig = {
  apiKey: "AIzaSyBBGSLp9zVJP027eUZRamAB1NDW7PY2MPo",
  authDomain: "vir-class-plat.firebaseapp.com",
  projectId: "vir-class-plat",
  storageBucket: "vir-class-plat.appspot.com",   
  messagingSenderId: "236710046166",
  appId: "1:236710046166:web:6f0ea8264b64837fd3dc77",
}


  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  console.warn("Firebase not configured. Please add Firebase environment variables to enable authentication.")
}

export { auth, db }
