const axios = require('axios');
const fs = require('fs');
const path = require('path');

const base = 'http://127.0.0.1:3000';
const email = `apitest${Date.now()}@test.com`;
const password = 'TestApiRoute2026!';

const bodyCheck = (accompanied) => ({
  origin: 'Ibituruna, Montes Claros - MG',
  destination: 'Montes Claros Shopping, Cidade Nova',
  user_id: null,
  transport_type: 'bus',
  accompanied,
});

function routeSignature(r) {
  const stages = r.stages || [];
  const parts = stages.map(
    (s) =>
      `${s.mode}|${String(s.instruction || '').slice(0, 50)}|${s.duration}|${s.distance}`,
  );
  return `${r.total_duration}|${r.total_distance}|${parts.join('>')}`;
}

function analyze(data, label) {
  const routes = data.routes || [];
  let inaccessibleStage = false;
  let hasWarning = false;
  let hasAccWarn = false;
  let slope = false;

  for (const r of routes) {
    if (r.warning) hasWarning = true;
    if (r.accompanied_warning) hasAccWarn = true;
    if (r.slope_warning) slope = true;
    for (const s of r.stages || []) {
      if (s.accessible === false) inaccessibleStage = true;
    }
  }

  return {
    label,
    count: routes.length,
    sigs: routes.map(routeSignature),
    inaccessibleStage,
    hasRouteWarning: hasWarning,
    hasAccompaniedWarning: hasAccWarn,
    slope_warning_any: slope,
    routeDetails: routes.map((r) => ({
      accessible: r.accessible,
      warning: r.warning ?? null,
      accompanied_warning: r.accompanied_warning ?? null,
      slope_warning: r.slope_warning ?? false,
      stagesAccessible: (r.stages || []).map((s) => s.accessible),
    })),
  };
}

(async () => {
  const reg = await axios.post(`${base}/users`, {
    name: 'API Route Test',
    email,
    password,
    confirm_password: password,
    disability_type: 'wheelchair',
  });
  const userId = reg.data.id;
  console.log('registered user id', userId, email);

  const login = await axios.post(`${base}/auth/login`, { email, password });
  const token = login.data.access_token;
  fs.writeFileSync(path.join(__dirname, 'tmp-access-token.txt'), token, 'utf8');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const payload1 = { ...bodyCheck('alone'), user_id: userId };
  const payload2 = { ...bodyCheck('accompanied'), user_id: userId };

  console.log('\nPOST /routes/check alone (pode demorar)...\n');
  const r1 = await axios.post(`${base}/routes/check`, payload1, { headers: h, timeout: 600_000 });
  fs.writeFileSync(path.join(__dirname, 'tmp-out-alone.json'), JSON.stringify(r1.data, null, 2), 'utf8');

  console.log('POST /routes/check accompanied...\n');
  const r2 = await axios.post(`${base}/routes/check`, payload2, { headers: h, timeout: 600_000 });
  fs.writeFileSync(path.join(__dirname, 'tmp-out-accompanied.json'), JSON.stringify(r2.data, null, 2), 'utf8');

  const a1 = analyze(r1.data, 'alone');
  const a2 = analyze(r2.data, 'accompanied');
  const same =
    a1.sigs.length === a2.sigs.length && a1.sigs.every((s, i) => s === a2.sigs[i]);

  const report = {
    user_id_used: userId,
    routes_different_between_tests: !same,
    alone: {
      count: a1.count,
      inaccessible_stage_any: a1.inaccessibleStage,
      warning_or_accompanied_warning: a1.hasRouteWarning || a1.hasAccompaniedWarning,
      slope_warning: a1.slope_warning_any,
    },
    accompanied: {
      count: a2.count,
      inaccessible_stage_any: a2.inaccessibleStage,
      warning_or_accompanied_warning: a2.hasRouteWarning || a2.hasAccompaniedWarning,
      slope_warning: a2.slope_warning_any,
    },
    details_alone: a1.routeDetails,
    details_accompanied: a2.routeDetails,
  };

  console.log('\n=== RELATÓRIO ===\n');
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
