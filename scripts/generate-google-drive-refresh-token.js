const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

// Load environment variables from .env.local (if present)
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.local'),
});

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error(
    'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Please set them in your environment before running this script.'
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'http://localhost'
);

const scopes = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
});

console.log('\nAuthorize this app by visiting this URL:\n');
console.log(authUrl);
console.log('\nAfter granting access, you will receive a code. Paste it below.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
      console.error('\nNo refresh token returned. Make sure you checked "Allow" and the client is set to access type offline.');
      process.exit(1);
    }

    console.log('\nSuccess! Add this to your .env.local file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nKeep this token secret.');
  } catch (error) {
    console.error('\nFailed to retrieve tokens:', error.message);
  } finally {
    rl.close();
  }
});
