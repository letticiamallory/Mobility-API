/**
 * Uma requisição POST /routes/check para gerar logs do Gemini no terminal do Nest.
 */
const axios = require('axios');
const path = require('path');

const base = 'http://127.0.0.1:3000';
const email = `gemlog${Date.now()}@t.com`;
const password = 'GemLogTest2026!';

(async () => {
  await axios.post(`${base}/users`, {
    name: 'Gem Log',
    email,
    password,
    confirm_password: password,
    disability_type: 'wheelchair',
  });
  const { access_token: token } = await axios.post(`${base}/auth/login`, {
    email,
    password,
  }).then((r) => r.data);

  const { data: me } = await axios.get(`${base}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = {
    origin: 'Ibituruna, Montes Claros - MG',
    destination: 'Montes Claros Shopping, Cidade Nova',
    user_id: me.id,
    transport_type: 'bus',
    accompanied: 'alone',
  };

  console.log('POST /routes/check user_id=', me.id);
  await axios.post(`${base}/routes/check`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 600_000,
  });
  console.log('OK — veja os logs [Gemini] no terminal do nest.');
})().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
