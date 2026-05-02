const axios = require('axios');
const jwt = require('jsonwebtoken');

const secrets = [
  'secret',
  'k8$mP2#vQxL9nRjT5wYzA1cF6hD3eB0',
];

(async () => {
  for (const secret of secrets) {
    const t = jwt.sign({ sub: 2, email: 'maria@email.com' }, secret, { expiresIn: '1h' });
    try {
      const r = await axios.get('http://127.0.0.1:3000/users/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      console.log('OK secret prefix:', String(secret).slice(0, 12), 'status', r.status);
    } catch (e) {
      console.log('FAIL', String(secret).slice(0, 12), e.response?.status, e.response?.data);
    }
  }
})();
