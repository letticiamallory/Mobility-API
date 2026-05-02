const fs = require('fs');
const path = require('path');

function load(p) {
  const raw = fs.readFileSync(path.join(__dirname, p), 'utf8');
  return JSON.parse(raw);
}

function routeSignature(r) {
  const stages = r.stages || [];
  const parts = stages.map(
    (s) =>
      `${s.mode}|${String(s.instruction || '').slice(0, 40)}|${s.duration}|${s.distance}`,
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
    hasWarning,
    hasAccWarn,
    slope,
    rawWarnings: routes.map((r) => ({
      warning: r.warning || null,
      accompanied_warning: r.accompanied_warning || null,
      slope_warning: r.slope_warning || false,
    })),
  };
}

const alone = analyze(load('tmp-out-alone.json'), 'alone');
const acc = analyze(load('tmp-out-accompanied.json'), 'accompanied');

const sameSet =
  alone.sigs.length === acc.sigs.length && alone.sigs.every((s, i) => s === acc.sigs[i]);

console.log(JSON.stringify({ alone, acc, routesIdentical: sameSet }, null, 2));
