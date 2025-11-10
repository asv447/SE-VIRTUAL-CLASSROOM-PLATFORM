import nodemailer from "nodemailer";
import { getDatabase } from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { email, verificationCode } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[SendInitialVerification] Sending to:", email);

    // Create transporter for SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Generate verification link
    const uid = Buffer.from(email).toString("base64");
    const verificationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify?uid=${uid}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1a1a2e;
              margin: 0;
              font-size: 28px;
            }
            .content {
              color: #333;
              line-height: 1.6;
              margin: 20px 0;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .verify-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: transform 0.2s;
            }
            .verify-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
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
          <div class="container">
            <div class="header">
              <h1>🎓 Virtual Classroom</h1>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>Welcome to Virtual Classroom Platform! 🎉</p>
              <p>To complete your email verification and proceed with registration, please click the button below:</p>
            </div>
            
            <div class="button-container">
              <a href="${verificationLink}" class="verify-button">✓ Verify Email Address</a>
            </div>
            
            <div class="content">
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationLink}</p>
              <p style="font-size: 13px; color: #999;">⏱️ This verification link expires in <strong>24 hours</strong>.</p>
            </div>

            <div class="content">
              <p>If you did not create this account, you can safely ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>&copy; Virtual Classroom Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Welcome to Virtual Classroom Platform!

To verify your email and proceed with registration, please visit this link:
${verificationLink}

This link expires in 24 hours.

If you did not create this account, you can safely ignore this email.
    `;

    // Store pending verification in database
    try {
      const db = await getDatabase();
      await db.collection("pendingVerifications").updateOne(
        { email: email },
        {
          $set: {
            email: email,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            verified: false,
          },
        },
        { upsert: true }
      );
      console.log("[SendInitialVerification] Pending verification stored for:", email);
    } catch (dbErr) {
      console.warn("[SendInitialVerification] Could not store pending verification:", dbErr.message);
    }

    // Send email
    await transporter.sendMail({
      from: `"Virtual Classroom" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify Your Email - Virtual Classroom",
      html: htmlContent,
      text: textContent,
    });

    console.log("[SendInitialVerification] Email sent successfully to:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification email sent successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[SendInitialVerification] Error:", err.message);
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to send verification email",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
