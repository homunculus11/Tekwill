// simple Google OAuth2 example using Express
// Run with `node server.js`; make sure you installed express and node-fetch:
//    npm install express node-fetch

import express from 'express';
import fetch from 'node-fetch';
import path from 'path';

const app = express();
const PORT = 3000;

// --- credentials (for demo only; in production keep them secret or in env vars) ---
const GOOGLE_CLIENT_ID = '278342882238-s7c4j9k4ecps4qcesrpmgq6ftm0r5bra.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
// When running locally the redirect URI should be registered in Google's console.
// Example: http://localhost:3000/auth/google/callback
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// serve your static files (login page etc.) for testing
app.use(express.static(path.join(process.cwd(), 'src')));

app.get('/auth/google', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    prompt: 'select_account'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('missing code');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenRes.json();
  // tokens.id_token is a JWT you should validate; tokens.access_token can be used to call Google APIs

  console.log('tokens received', tokens);

  // TODO: verify id_token and create your own session/database record
  res.send('Logged in! check server console for tokens');
});

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
});