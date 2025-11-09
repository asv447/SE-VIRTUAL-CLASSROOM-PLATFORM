// API route to send verification email via SMTP (Nodemailer)
// Called from Register.jsx instead of Firebase's sendEmailVerification()
import nodemailer from "nodemailer";
import { auth } from "@/lib/firebase";

// Verify environment variables are set
const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_EMAIL,
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn(
    "SMTP configuration incomplete. Email sending will not work. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local"
  );
}

// Create transporter (SMTP connection)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT),
  secure: parseInt(SMTP_PORT) === 465, // use TLS for 587, SSL for 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify transporter connection on startup (optional)
transporter
  .verify()
  .then(() => console.log("[Nodemailer] SMTP connected successfully"))
  .catch((err) => console.error("[Nodemailer] SMTP error:", err));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, email } = req.body;

  if (!uid || !email) {
    return res
      .status(400)
      .json({ error: "uid and email are required" });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({
      error:
        "SMTP configuration missing. Please configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local",
    });
  }

  try {
    // Generate Firebase action code (verification link)
    // We'll use Firebase Admin SDK on the server if available,
    // or pass the link generation to client and just send email here.
    // For now, we use Firebase's generateEmailVerificationLink via Admin SDK or Client API.

    // Approach: Use Firebase REST API or Admin SDK to generate the verification link
    // For simplicity with Next.js API route, we generate a custom link.
    // In production, you'd use Firebase Admin SDK on a server function.

    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify?uid=${uid}`;

    // Email HTML template with professional dark styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verify Your Email</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              padding: 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              border: 1px solid rgba(148, 163, 184, 0.2);
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            }
            .logo-section {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid rgba(148, 163, 184, 0.2);
            }
            .logo {
              font-size: 24px;
              font-weight: 700;
              color: #10b981;
              text-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #f1f5f9;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .header p {
              color: #cbd5e1;
              font-size: 14px;
              margin: 0;
            }
            .content {
              color: #cbd5e1;
              font-size: 15px;
              line-height: 1.7;
              margin-bottom: 30px;
            }
            .content p {
              margin-bottom: 15px;
            }
            .content strong {
              color: #10b981;
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .verify-button {
              display: inline-block;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 14px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
              border: none;
              cursor: pointer;
            }
            .verify-button:hover {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
              transform: translateY(-2px);
            }
            .link-section {
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.2);
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            .link-section p {
              color: #cbd5e1;
              font-size: 13px;
              margin-bottom: 10px;
            }
            .verification-link {
              color: #10b981;
              word-break: break-all;
              font-size: 12px;
              font-family: 'Courier New', monospace;
              background: rgba(0, 0, 0, 0.3);
              padding: 12px;
              border-radius: 6px;
              display: block;
            }
            .security-note {
              background: rgba(239, 68, 68, 0.1);
              border-left: 4px solid #ef4444;
              border-radius: 6px;
              padding: 15px;
              margin: 25px 0;
              font-size: 13px;
              color: #fca5a5;
            }
            .footer {
              text-align: center;
              color: #64748b;
              font-size: 12px;
              margin-top: 35px;
              padding-top: 20px;
              border-top: 1px solid rgba(148, 163, 184, 0.2);
            }
            .footer p {
              margin: 5px 0;
            }
            .social-links {
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              <div class="logo">🎓 Virtual Classroom</div>
            </div>
            
            <div class="header">
              <h1>Verify Your Email Address</h1>
              <p>Complete your registration to get started</p>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>Welcome to <strong>Virtual Classroom Platform</strong>! 🎉</p>
              <p>Thank you for registering. To complete your registration and unlock all features, please verify your email address by clicking the button below.</p>
              <p style="font-size: 13px; color: #94a3b8;">⏱️ This verification link expires in <strong>24 hours</strong>.</p>
            </div>
            
            <div class="button-container">
              <a href="${verificationLink}" class="verify-button">✓ Verify Email Address</a>
            </div>
            
            <div class="link-section">
              <p>📎 If the button doesn't work, copy and paste this link in your browser:</p>
              <span class="verification-link">${verificationLink}</span>
            </div>
            
            <div class="security-note">
              ⚠️ <strong>Security Notice:</strong> If you didn't create this account, please ignore this email or contact our support team immediately.
            </div>
            
            <div class="content">
              <p>Once verified, you'll be able to:</p>
              <p style="margin-left: 20px;">✓ Access all courses and classrooms<br/>✓ Submit assignments<br/>✓ Participate in discussions<br/>✓ Track your progress</p>
            </div>
            
            <div class="footer">
              <p>&copy; 2024 Virtual Classroom Platform. All rights reserved.</p>
              <p>Questions? Contact us at support@virtualclassroom.com</p>
              <div class="social-links">
                <p>Stay connected with us for updates and announcements</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text fallback
    const textContent = `
╔═══════════════════════════════════════════════════════════╗
║         VIRTUAL CLASSROOM - EMAIL VERIFICATION             ║
╚═══════════════════════════════════════════════════════════╝

Hello,

Welcome to Virtual Classroom Platform! 🎓

Thank you for registering. To complete your registration and start using all features, please verify your email address.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFICATION LINK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${verificationLink}

⏱️ This link expires in 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Once verified, you'll be able to:

✓ Access all courses and classrooms
✓ Submit assignments and track progress
✓ Participate in class discussions
✓ Receive notifications and updates
✓ Manage your profile and preferences

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY NOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you didn't create this account, please ignore this email or 
contact our support team immediately at:
support@virtualclassroom.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
Virtual Classroom Platform Team

© 2024 Virtual Classroom Platform. All rights reserved.

For support, visit: support@virtualclassroom.com
    `;

    // Send email
    const mailOptions = {
      from: SMTP_FROM_EMAIL || SMTP_USER, // sender address
      to: email,
      subject: "Verify Your Email Address - Virtual Classroom",
      text: textContent,
      html: htmlContent,
      replyTo: SMTP_USER,
      // Headers to help avoid spam folder
      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "X-Mailer": "Virtual Classroom",
        "List-Unsubscribe": "<mailto:noreply@virtualclassroom.com>",
      },
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("[Verification Email] Sent successfully:", {
      messageId: info.messageId,
      to: email,
      uid,
    });

    return res.json({
      ok: true,
      message: "Verification email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("[Verification Email] Error sending email:", error);
    return res.status(500).json({
      error: "Failed to send verification email",
      details: error.message,
    });
  }
}
