"use client"
import { useState,useEffect } from "react"
import { auth } from "../../lib/firebase"
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import Login from "./Login"
const db = getFirestore()

export default function Register({ onBackToHome }) {
  const [showLogin, setShowLogin] = useState(false); // toggle between register and login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // keep online status in sync
  useEffect(() => {
    function handleOnline() { setIsOnline(true); setError(""); }
    function handleOffline() { setIsOnline(false); setError("You are offline. Please connect to the internet and try again."); }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (showLogin) {
    return (
      <Login
        onBackToRegister={() => setShowLogin(false)}
        onBackToHome={onBackToHome}
      />
    );
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if(!email) {
      setError("Please enter an email.");
      return;
    }
    if(!password) {
      setError("Please enter a password.");
      return;
    }
    if(password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if(!isOnline) {
      setError("You're offline. Connect to the internet to register.");
      return;
    }

    setLoading(true);
    try {
       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

       try {
        await sendEmailVerification(user);
        setMessage("Verification email sent. Please check your inbox to verify your account.");
      } catch (verifErr) {
        // verification send failed — still continue but inform user
        console.warn("sendEmailVerification error:", verifErr);
        setError("Account created but failed to send verification email. Please check your email settings.");
      }

      // wuser document
      const username = email.split("@")[0];
      console.log("Creating user document for:", user.uid, username, email);
      await setDoc(doc(db, "users", user.uid), {
        username,
        email,
        role: "student",
        createdAt: new Date().toISOString(),
      });

      // barabar
      setError("");
      setMessage((msg) => (msg ? msg + " Account created successfully!" : "Account created successfully!"));

      // call 
      onBackToHome && onBackToHome();
    } catch (e) {
      // handle network/offline specific error from Firebase
      const msg = (e && e.message) ? e.message : String(e);
      if (msg.toLowerCase().includes("client is offline") || msg.toLowerCase().includes("offline")) {
        setError("Failed to contact server: you appear to be offline. Connect to the internet and try again.");
      } else {
        //Firebase err
        if (e.code === "auth/email-already-in-use") {
          setError("This email is already in use. Try logging in or use a different email.");
        } else if (e.code === "auth/invalid-email") {
          setError("Invalid email address.");
        } else if (e.code === "auth/weak-password") {
          setError("Password is too weak. Choose a stronger password (at least 6 characters).");
        } else {
          setError(msg);
        }
      }
      setMessage("");
      console.error("Register error:", e);
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleRegister = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        const username = user.email.split("@")[0]
        await setDoc(doc(db, "users", user.uid), {
          username: username,
          email: user.email,
          role: "student",
        })
      }

      onBackToHome && onBackToHome()
    } catch (err) {
      setError(err.message)
      setMessage("")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center via-indigo-200 to-purple-200 animate-gradient">
      <div className="bg-white/90 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/40">
        <h2 className="text-center text-3xl font-extrabold text-gray-800 drop-shadow-sm">
          Create your account
        </h2>

        <form className="mt-6 space-y-6" onSubmit={handleRegister}>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          {message && <div className="text-green-600 text-sm text-center">{message}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            Sign up
          </button>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="w-full py-2 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium shadow-md hover:bg-gray-100 hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            Sign up with Google
          </button>

          <div className="text-center space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Already have an account? Login
            </button>
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="text-gray-600 hover:text-gray-500 text-sm block"
              >
                Back to Home
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}

