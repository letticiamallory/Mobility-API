const axios = require('axios');

(async () => {
  try {
    const r = await axios.post('http://127.0.0.1:3000/auth/login', {
      email: 'maria@email.com',
      password: 'MobilityTest2026!',
    });
    console.log('OK', r.data);
    require('fs').writeFileSync(
      require('path').join(__dirname, 'tmp-access-token.txt'),
      r.data.access_token,
      'utf8',
    );
  } catch (e) {
    console.log('FAIL', e.response?.status, e.response?.data);
  }
})();
