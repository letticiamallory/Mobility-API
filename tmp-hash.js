const bcrypt = require('bcrypt');
(async () => {
  const h = await bcrypt.hash('MobilityTest2026!', 10);
  require('fs').writeFileSync(require('path').join(__dirname, 'tmp-hash.txt'), h, 'utf8');
  const ok = await bcrypt.compare('MobilityTest2026!', h);
  console.log('hash written', ok);
})();
