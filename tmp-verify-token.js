const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

function readSecret() {
  const envPath = path.join(__dirname, '.env');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('JWT_SECRET='));
  return line ? line.split('=').slice(1).join('=').trim() : 'secret';
}

const secret = readSecret();
const tok = fs.readFileSync(path.join(__dirname, 'tmp-token.txt'), 'utf8').trim();
try {
  const p = jwt.verify(tok, secret);
  console.log('verify OK', p);
} catch (e) {
  console.log('verify FAIL', e.message);
}
