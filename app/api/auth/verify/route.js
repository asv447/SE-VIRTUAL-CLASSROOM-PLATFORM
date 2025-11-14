import { getDatabase } from "@/lib/mongodb";

// Verification callback route - triggered when user clicks the email link
// Returns an HTML page; updates verification flag in database
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");

    if (!uid && !email) {
      return new Response("uid or email is required", { status: 400 });
    }

    const identifier = uid ? `uid: ${uid}` : `email: ${email}`;
    console.log("[Verification] Email verification link clicked for", identifier);

    // Mark user as verified in database
    try {
      const db = await getDatabase();
      const query = uid ? { uid: uid } : { email: email };
      // Use upsert: true so that verification will create a placeholder user doc
      // when one does not already exist (matched by email or uid).
      const result = await db.collection("users").updateOne(
        query,
        { 
          $set: { 
            emailVerified: true,
            emailVerifiedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log("[Verification] Database update result:", result);
      
      if (result.matchedCount === 0 && !result.upsertedId) {
        console.warn("[Verification] User not found in database with uid:", uid);
        // Still show success to avoid confusing the user
      } else {
        console.log("[Verification] User marked as verified in database");
      }
    } catch (err) {
      console.error("[Verification] Database error:", err.message);
      // Continue anyway - client will detect via polling
    }

    // If this is an automatic/image request (email client loading remote images),
    // return a 1x1 transparent GIF so the request completes without opening a page.
    try {
      const auto = new URL(req.url).searchParams.get('auto');
      if (auto && (auto === '1' || auto === 'true')) {
        // 1x1 transparent GIF (base64 decoded)
        const gifBase64 = 'R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
        const buffer = Buffer.from(gifBase64, 'base64');
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Content-Length': String(buffer.length),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    } catch (err) {
      // ignore and continue to return the regular HTML page
      console.error('[Verification] auto image check error:', err?.message || err);
    }

    // Return HTML success page with verification token for client
    const tokenValue = uid || email;
    const verificationToken = Buffer.from(tokenValue).toString('base64');
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
              const key = '${uid ? 'emailVerified_' + uid : 'emailVerified_' + email}';
              sessionStorage.setItem(key, '${verificationToken}');
              console.log('[Verify Page] Stored verification token');
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
