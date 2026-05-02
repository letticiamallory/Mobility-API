const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'Mobility',
  });
  await c.connect();
  const r = await c.query('SELECT password FROM users WHERE id = 2');
  const hash = r.rows[0].password;
  const ok = await bcrypt.compare('MobilityTest2026!', hash);
  console.log('compare', ok, 'hash prefix', hash?.slice(0, 20));
  await c.end();
})();
