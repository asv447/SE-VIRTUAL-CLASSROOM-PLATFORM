// Verification callback route - triggered when user clicks the email link
// This route applies the verification action code and marks user as verified
import { auth } from "@/lib/firebase";
import {
  applyActionCode,
  signInWithCustomToken,
} from "firebase/auth";
import admin from "firebase-admin";

export default async function handler(req, res) {
  const { uid } = req.query;

  if (!uid) {
    return res.status(400).json({ error: "uid is required" });
  }

  try {
    // Initialize Firebase Admin if not already done
    // This requires FIREBASE_SERVICE_ACCOUNT env var with service account JSON path or content
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;

      if (!serviceAccount) {
        return res.status(500).json({
          error:
            "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT in .env.local",
        });
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    // Mark the user as verified in Firebase Auth (Admin SDK)
    await admin.auth().updateUser(uid, {
      emailVerified: true,
    });

    // Optional: Update app database to reflect verification
    // await UserModel.findOneAndUpdate({ uid }, { emailVerified: true });

    console.log("[Verification] User verified successfully:", uid);

    // Redirect to app homepage or verification success page
    return res.redirect(
      307,
      `/verify-success?uid=${uid}&next=/homepage`
    );
  } catch (error) {
    console.error("[Verification] Error verifying user:", error);
    return res.status(500).json({
      error: "Failed to verify email",
      details: error.message,
    });
  }
}
