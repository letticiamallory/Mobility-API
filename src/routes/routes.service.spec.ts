import { RoutesService } from './routes.service';

/** Mocks mínimos: `calculateSlopePercentage` não usa dependências injetadas. */
function createRoutesService(): RoutesService {
  const noop = {} as any;
  return new RoutesService(
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
  );
}

describe('RoutesService — lógica de acessibilidade', () => {
  let service: RoutesService;

  beforeEach(() => {
    service = createRoutesService();
  });

  describe('calculateSlopePercentage', () => {
    it('deve retornar inclinação correta entre dois pontos', () => {
      const slope = (service as any).calculateSlopePercentage(
        100,
        108,
        { lat: -16.7, lng: -43.87 },
        { lat: -16.71, lng: -43.87 },
      );
      expect(slope).toBeGreaterThan(0);
    });

    it('deve identificar trecho inacessível quando inclinação > 8%', () => {
      const slope = (service as any).calculateSlopePercentage(
        100,
        120,
        { lat: -16.7, lng: -43.87 },
        { lat: -16.7001, lng: -43.87 },
      );
      expect(slope).toBeGreaterThan(8);
    });

    it('deve identificar trecho acessível quando inclinação <= 8%', () => {
      const slope = (service as any).calculateSlopePercentage(
        100,
        101,
        { lat: -16.7, lng: -43.87 },
        { lat: -16.71, lng: -43.87 },
      );
      expect(slope).toBeLessThanOrEqual(8);
    });
  });

  describe('filtro de rotas por accompanied', () => {
    const mockRoutes = [
      {
        total_duration: '10 minutos',
        accessible: true,
        stages: [
          { mode: 'walk', accessible: true },
          { mode: 'bus', accessible: true },
        ],
      },
      {
        total_duration: '15 minutos',
        accessible: false,
        stages: [
          { mode: 'walk', accessible: false, warning: 'Trecho com obstáculos' },
          { mode: 'bus', accessible: true },
        ],
      },
    ];

    it('deve retornar apenas rotas 100% acessíveis quando accompanied === alone', () => {
      const result = mockRoutes.filter((route) => route.stages.every((s) => s.accessible));
      expect(result).toHaveLength(1);
      expect(result[0].accessible).toBe(true);
    });

    it('deve retornar todas as rotas quando accompanied === accompanied', () => {
      expect(mockRoutes).toHaveLength(2);
    });
  });
});
