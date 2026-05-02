const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
let secret = 'secret';
if (fs.existsSync(envPath)) {
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('JWT_SECRET='));
  if (line) secret = line.split('=').slice(1).join('=').trim();
}
const t = jwt.sign({ sub: 2, email: 'u@u.com' }, secret, { expiresIn: '2h' });
require('fs').writeFileSync(require('path').join(__dirname, 'tmp-token.txt'), t, 'utf8');
console.log(t);
