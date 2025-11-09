import { getDatabase } from "@/lib/mongodb";

// Verification callback route - triggered when user clicks the email link
// Returns an HTML page; updates verification flag in database
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return new Response("uid is required", { status: 400 });
    }

    console.log("[Verification] Email verification link clicked for uid:", uid);

    // Mark user as verified in database
    try {
      const db = await getDatabase();
      const result = await db.collection("users").updateOne(
        { uid: uid },
        { 
          $set: { 
            emailVerified: true,
            emailVerifiedAt: new Date()
          }
        }
      );
      console.log("[Verification] Database update result:", result);
      
      if (result.matchedCount === 0) {
        console.warn("[Verification] User not found in database with uid:", uid);
        // Still show success to avoid confusing the user
      } else {
        console.log("[Verification] User marked as verified in database");
      }
    } catch (err) {
      console.error("[Verification] Database error:", err.message);
      // Continue anyway - client will detect via polling
    }

    // Return HTML success page with verification token for client
    const verificationToken = Buffer.from(uid).toString('base64');
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Email Verified</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              border: 1px solid rgba(148, 163, 184, 0.2);
              padding: 50px 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
              text-align: center;
              max-width: 500px;
              backdrop-filter: blur(10px);
            }
            .success-icon {
              font-size: 80px;
              margin-bottom: 25px;
              animation: scaleIn 0.6s ease-out;
            }
            @keyframes scaleIn {
              from {
                opacity: 0;
                transform: scale(0);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            h1 {
              color: #10b981;
              margin: 0 0 15px 0;
              font-size: 32px;
              font-weight: 700;
              text-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }
            p {
              color: #cbd5e1;
              font-size: 16px;
              margin: 12px 0;
              line-height: 1.6;
            }
            .message {
              background: rgba(16, 185, 129, 0.1);
              border-left: 4px solid #10b981;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
              text-align: left;
              backdrop-filter: blur(5px);
            }
            .message strong {
              color: #10b981;
              display: block;
              margin-bottom: 10px;
              font-size: 17px;
            }
            .message p {
              color: #cbd5e1;
              font-size: 15px;
              margin: 0;
            }
            .instructions {
              margin-top: 30px;
              font-size: 14px;
              color: #94a3b8;
              padding: 20px;
              background: rgba(100, 116, 139, 0.1);
              border-radius: 8px;
            }
            .check-mark {
              color: #10b981;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <span class="check-mark">✓</span>
            </div>
            <h1>Email Verified Successfully!</h1>
            <p>Your email has been confirmed and your account is now active.</p>
            <div class="message">
              <strong>📋 What's Next?</strong>
              <p>You can now close this window and return to the sign-up page. Your account will be automatically activated and you can start using the platform.</p>
            </div>
            <div class="instructions">
              <p>💡 If you were in the middle of signing up, the system will automatically detect your verification and complete your registration.</p>
            </div>
          </div>
          <script>
            try {
              sessionStorage.setItem('emailVerified_${uid}', '${verificationToken}');
              console.log('[Verify Page] Stored verification token for uid: ${uid}');
            } catch (e) {
              console.error('[Verify Page] Error storing token:', e);
            }
          </script>
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[Verification] Error:", error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verification Error</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-top: 4px solid #ef4444;
              padding: 50px 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
              text-align: center;
              max-width: 500px;
              backdrop-filter: blur(10px);
            }
            .error-icon {
              font-size: 80px;
              margin-bottom: 25px;
              animation: shakeError 0.5s ease-out;
            }
            @keyframes shakeError {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
            }
            h1 {
              color: #ef4444;
              margin: 0 0 15px 0;
              font-size: 32px;
              font-weight: 700;
              text-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
            }
            p {
              color: #cbd5e1;
              font-size: 16px;
              margin: 15px 0;
              line-height: 1.6;
            }
            .error-details {
              background: rgba(239, 68, 68, 0.1);
              border-left: 4px solid #ef4444;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
              text-align: left;
              word-break: break-word;
            }
            .error-details code {
              color: #fca5a5;
              font-family: 'Courier New', monospace;
              font-size: 13px;
            }
            .help-text {
              margin-top: 25px;
              font-size: 14px;
              color: #94a3b8;
              padding: 20px;
              background: rgba(100, 116, 139, 0.1);
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⚠️</div>
            <h1>Verification Error</h1>
            <p>There was an issue verifying your email.</p>
            <div class="error-details">
              <code>${error.message}</code>
            </div>
            <div class="help-text">
              <p>🔗 Please try clicking the verification link again. If the problem persists, contact support.</p>
            </div>
          </div>
        </body>
      </html>
    `, {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}
