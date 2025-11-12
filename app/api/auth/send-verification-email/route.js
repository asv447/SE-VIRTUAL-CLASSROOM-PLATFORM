// API route to send verification email via SMTP (Nodemailer)
// Called from Register.jsx instead of Firebase's sendEmailVerification()
import nodemailer from "nodemailer";
import { getAuth } from "firebase/auth";

// Verify environment variables are set
const {
  SMTP_HOST,
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_EMAIL,
} = process.env;

console.log("[SMTP Config]", {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER: SMTP_USER ? "***" : "MISSING",
  SMTP_PASS: SMTP_PASS ? "***" : "MISSING",
});

let transporter = null;

// Create transporter (SMTP connection) - lazy loaded
async function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP configuration incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local"
    );
  }

  const port = parseInt(SMTP_PORT || "587");
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: port,
    secure: port === 465, // use TLS for 587, SSL for 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    logger: true,
    debug: true,
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log("[Nodemailer] SMTP connection verified");
  } catch (err) {
    console.error("[Nodemailer] SMTP verification failed:", err);
    throw err;
  }

  return transporter;
}

export async function POST(req) {
  try {
    const { uid, email } = await req.json();

    if (!email) {
      return Response.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return Response.json(
        {
          error:
            "SMTP configuration missing. Please configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local",
        },
        { status: 500 }
      );
    }

    // Build an absolute app URL for the verification link in a robust way:
    // 1) Prefer NEXT_PUBLIC_APP_URL (explicitly configured public URL)
    // 2) If not present, prefer VERCEL_URL (when running on Vercel)
    // 3) Otherwise try to derive from request headers (x-forwarded-proto / x-forwarded-host or host)
    // 4) Fallback to localhost (developer machine)
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    let appUrl = envAppUrl;

    if (!appUrl) {
      try {
        const forwardedProto = req.headers.get("x-forwarded-proto");
        const forwardedHost = req.headers.get("x-forwarded-host");
        const hostHeader = req.headers.get("host");
        const proto = forwardedProto || (req.headers.get("referer") ? new URL(req.headers.get("referer")).protocol.replace(':','') : null) || 'http';
        const host = forwardedHost || hostHeader || (req.headers.get("referer") ? new URL(req.headers.get("referer")).host : null);
        if (host) {
          appUrl = `${proto}://${host}`;
        }
      } catch (err) {
        // ignore URL parsing errors and fall back below
      }
    }

    if (!appUrl) {
      appUrl = "http://localhost:3000";
      console.warn("[Verification Email] No public app URL detected; falling back to:", appUrl, " — set NEXT_PUBLIC_APP_URL to a public URL to avoid localhost links in emails");
    }

    const verificationLink = uid
      ? `${appUrl}/api/auth/verify?uid=${encodeURIComponent(uid)}`
      : `${appUrl}/api/auth/verify?email=${encodeURIComponent(email)}`;

    // Email HTML template with professional styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f5f5f5;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #333;
              margin: 0;
              font-size: 28px;
            }
            .content {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .verify-button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              transition: background-color 0.3s;
            }
            .verify-button:hover {
              background-color: #0056b3;
            }
            .link-text {
              color: #007bff;
              word-break: break-all;
              font-size: 14px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #999;
              font-size: 12px;
              margin-top: 30px;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <!-- Invisible image that will call the verification endpoint when mail clients load remote images.
               This allows verification to occur without the user opening a browser tab when images are enabled. -->
          <img src="${verificationLink}&auto=1" alt="" style="display:none;width:1px;height:1px;" />
          <div class="container">
            <div class="header">
              <h1>Verify Your Email Address</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for registering with Virtual Classroom. To complete your registration and start using your account, please verify your email address by clicking the button below.</p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="button-container">
              <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
            </div>
            <div class="link-text">
              <p>Or copy and paste this link in your browser:</p>
              <p>${verificationLink}</p>
            </div>
            <div class="content">
              <p>If you did not create this account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; Virtual Classroom Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textContent = `
Hello,

Thank you for registering with Virtual Classroom. To complete your registration and start using your account, please verify your email address.

Verification Link:
${verificationLink}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
Virtual Classroom Platform
    `;

    const mail = await getTransporter();

    // Send email
    const mailOptions = {
      from: SMTP_FROM_EMAIL || SMTP_USER,
      to: email,
      subject: "Verify Your Email Address - Virtual Classroom",
      text: textContent,
      html: htmlContent,
      replyTo: SMTP_USER,
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "X-Mailer": "Virtual Classroom",
      },
    };

    console.log("[Verification Email] Sending to:", email);
    const info = await mail.sendMail(mailOptions);

    console.log("[Verification Email] Sent successfully:", {
      messageId: info.messageId,
      to: email,
      uid: uid || "N/A",
    });

    return Response.json({
      ok: true,
      message: "Verification email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("[Verification Email] Error sending email:", error);
    return Response.json(
      {
        error: "Failed to send verification email",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
