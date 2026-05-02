const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const hash = fs.readFileSync(path.join(__dirname, 'tmp-hash.txt'), 'utf8').trim();

(async () => {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'Mobility',
  });
  await c.connect();
  await c.query('UPDATE users SET password = $1 WHERE id = 2', [hash]);
  console.log('password updated for id=2');
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
