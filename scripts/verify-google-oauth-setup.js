#!/usr/bin/env node
/**
 * Prints the Google OAuth settings required for Pyonea production + local dev.
 * Run: node scripts/verify-google-oauth-setup.js
 */

const clientId = '538453685845-chtpoo3e5mas6kbpp9nj1fjeq9e5slk1.apps.googleusercontent.com';

const authorizedOrigins = [
  'https://pyonea.com',
  'https://www.pyonea.com',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:19006',
];

const legacyRedirectUris = [
  'https://www.pyonea.com/auth/google/callback',
  'https://pyonea.com/auth/google/callback',
];

console.log('Pyonea Google OAuth verification checklist\n');
console.log(`Web client ID: ${clientId}`);
console.log('\n1) Google Cloud Console → APIs & Services → Credentials');
console.log('   Open the OAuth 2.0 Client ID (Web application) with the client ID above.\n');

console.log('2) Authorized JavaScript origins (REQUIRED for Expo web login):');
authorizedOrigins.forEach((origin) => console.log(`   - ${origin}`));

console.log('\n3) Authorized redirect URIs (legacy React SPA only — optional for Expo web):');
legacyRedirectUris.forEach((uri) => console.log(`   - ${uri}`));

console.log('\n4) Backend Laravel .env must match the same web client ID:');
console.log(`   GOOGLE_CLIENT_ID=${clientId}`);

console.log('\n5) Expo production build embeds client ID from EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
console.log('   Rebuild with: npm run export:web');

console.log('\n6) Native apps need separate Android/iOS OAuth clients:');
console.log('   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...');
console.log('   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...');
console.log(`   Native redirect URI: pyoneaapp://auth/google`);

console.log('\n7) Deploy public/.htaccess so /login and other SPA routes work on Namecheap.');

const checkOrigin = process.argv[2];
if (checkOrigin) {
  const ok = authorizedOrigins.includes(checkOrigin);
  console.log(`\nOrigin check: ${checkOrigin} → ${ok ? 'OK (listed)' : 'MISSING — add to Google Console'}`);
  process.exitCode = ok ? 0 : 1;
}
