import {
  computeAccessibilityScore,
  hasHighBlocker,
  partitionRoutesByScore,
  ROUTES_ALONE_MIN_SCORE,
} from './route-scoring.util';

describe('route-scoring.util', () => {
  const walk = (overrides: Record<string, unknown> = {}) => ({
    mode: 'walk',
    accessible: true,
    warning: null,
    slope_warning: false,
    duration: '5 min',
    location: { lat: -23.55, lng: -46.63 },
    end_location: { lat: -23.551, lng: -46.631 },
    ...overrides,
  });

  it('rota limpa pontua perto de 100', () => {
    const route = { accessible: true, slope_warning: false, stages: [walk()] };
    expect(computeAccessibilityScore(route)).toBeGreaterThanOrEqual(95);
  });

  it('penaliza bloqueadores por severidade', () => {
    const high = computeAccessibilityScore({
      accessible: true,
      slope_warning: false,
      stages: [
        walk({
          accessibility_report: {
            confidence: 'high',
            blockers: [{ type: 'stairs_or_steps', severity: 'high' }],
          },
        }),
      ],
    });
    const med = computeAccessibilityScore({
      accessible: true,
      slope_warning: false,
      stages: [
        walk({
          accessibility_report: {
            confidence: 'medium',
            blockers: [{ type: 'rough_surface', severity: 'medium' }],
          },
        }),
      ],
    });
    const low = computeAccessibilityScore({
      accessible: true,
      slope_warning: false,
      stages: [
        walk({
          accessibility_report: {
            confidence: 'high',
            blockers: [{ type: 'ors_wheelchair_detour', severity: 'low' }],
          },
        }),
      ],
    });
    expect(high).toBeLessThan(med);
    expect(med).toBeLessThan(low);
  });

  it('score de rota com warning textual em walk fica abaixo de rota limpa', () => {
    const dirty = computeAccessibilityScore({
      accessible: true,
      slope_warning: false,
      stages: [walk({ warning: 'Trecho com inclinacao 9% (acima de 8%).' })],
    });
    const clean = computeAccessibilityScore({
      accessible: true,
      slope_warning: false,
      stages: [walk()],
    });
    expect(dirty).toBeLessThan(clean);
  });

  it('partição: rota com bloqueador high vai para Acompanhado mesmo com score alto', () => {
    const routes = [
      {
        accessible: true,
        slope_warning: false,
        total_duration: '15 min',
        stages: [
          walk({
            accessibility_report: {
              confidence: 'high',
              blockers: [{ type: 'stairs_or_steps', severity: 'high' }],
            },
          }),
        ],
      },
    ];
    const part = partitionRoutesByScore(routes);
    expect(part.alone).toHaveLength(0);
    expect(part.companied).toHaveLength(1);
  });

  it('partição: as duas listas são sempre disjuntas', () => {
    const routes = [
      { accessible: true, slope_warning: false, total_duration: '10 min', stages: [walk()] },
      { accessible: true, slope_warning: false, total_duration: '15 min', stages: [walk()] },
      {
        accessible: false,
        slope_warning: false,
        total_duration: '5 min',
        stages: [walk({ accessible: false, warning: 'obstaculo' })],
      },
    ];
    const part = partitionRoutesByScore(routes);
    const aloneSet = new Set(part.alone);
    const intersection = part.companied.filter((r) => aloneSet.has(r));
    expect(intersection).toHaveLength(0);
  });

  it('hasHighBlocker detecta apenas severity high', () => {
    expect(
      hasHighBlocker({
        stages: [
          {
            mode: 'walk',
            accessibility_report: {
              confidence: 'medium',
              blockers: [{ type: 'rough_surface', severity: 'medium' }],
            },
          },
        ],
      }),
    ).toBe(false);
    expect(
      hasHighBlocker({
        stages: [
          {
            mode: 'walk',
            accessibility_report: {
              confidence: 'high',
              blockers: [{ type: 'stairs_or_steps', severity: 'high' }],
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it('rota com score abaixo do piso vai para Acompanhado', () => {
    const lowScoreRoute = {
      accessible: true,
      slope_warning: false,
      total_duration: '20 min',
      stages: [
        walk({
          warning: 'Trecho 1 com obstaculos',
          accessibility_report: {
            confidence: 'medium',
            blockers: [
              { type: 'rough_surface', severity: 'medium' },
              { type: 'ors_no_wheelchair_route', severity: 'medium' },
            ],
          },
        }),
        walk({
          warning: 'Trecho 2 com obstaculos',
          slope_warning: true,
        }),
      ],
    };
    const score = computeAccessibilityScore(lowScoreRoute);
    expect(score).toBeLessThan(ROUTES_ALONE_MIN_SCORE);
    const part = partitionRoutesByScore([lowScoreRoute]);
    expect(part.alone).toHaveLength(0);
    expect(part.companied).toHaveLength(1);
  });
});
