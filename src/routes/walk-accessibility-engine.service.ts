import { Injectable, Logger } from '@nestjs/common';
import { OverpassService } from '../accessibility/overpass.service';
import { OrsService } from './ors.service';
import type { RouteStage } from './google-routes.service';
import type {
  LegAccessibilityBlocker,
  LegAccessibilityReport,
} from './contracts/route-accessibility.contract';
import { walkSegmentCoordsOk } from './utils/stage-normalization.util';
export type WalkLegAnalysisInput = {
  stage: RouteStage;
  /** Inclinação estimada (%), já calculada com elevação; null se sem coords/dados. */
  slopePercent: number | null;
  /** Distância declarada no trecho (ex. Google "300 m") — Fase 2–3 (heurística de desvio ORS). */
  declaredWalkMeters?: number | null;
};

function readPositiveFloatEnv(key: string, defaultVal: number): number {
  const raw = `${process.env[key] ?? ''}`.trim().replace(',', '.');
  if (!raw) return defaultVal;
  const n = Number(raw);
  return Number.isFinite(n) && n > 1 ? n : defaultVal;
}

function readNonNegativeIntEnv(key: string, defaultVal: number): number {
  const raw = `${process.env[key] ?? ''}`.trim();
  if (!raw) return defaultVal;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultVal;
}

@Injectable()
export class WalkAccessibilityEngineService {
  private readonly logger = new Logger(WalkAccessibilityEngineService.name);

  constructor(
    private readonly overpassService: OverpassService,
    private readonly orsService: OrsService,
  ) {}

  /**
   * Motor estruturado: Fase 1 (OSM + inclinação) + Fase 2 (ORS wheelchair obrigatório quando há API key).
   * Não chama Gemini; pode ser desativado com DISABLE_STRUCTURAL_ACCESSIBILITY=1.
   */
  async analyzeWalkLeg(input: WalkLegAnalysisInput): Promise<LegAccessibilityReport> {
    if (process.env.DISABLE_STRUCTURAL_ACCESSIBILITY === '1') {
      return {
        confidence: 'medium',
        blockers: [],
        sources: ['structural_disabled'],
      };
    }

    const { stage, slopePercent } = input;
    const walkOk = walkSegmentCoordsOk(stage);
    const blockers: LegAccessibilityBlocker[] = [];
    const sources: string[] = [];
    if (slopePercent !== null) {
      sources.push('elevation_slope');
    }

    if (!walkOk) {
      return {
        confidence: 'low',
        blockers: [
          {
            type: 'missing_geometry',
            severity: 'high',
            detail: 'Trecho a pé sem coordenadas completas para análise estruturada',
          },
        ],
        sources: [],
      };
    }

    if (slopePercent !== null && slopePercent > 8) {
      blockers.push({
        type: 'excessive_slope',
        severity: 'high',
        detail: `Inclinação ~${slopePercent.toFixed(1)}%`,
      });
    }

    const { stepFeatureCount, roughSurfaceFeatureCount, queryFailed } =
      await this.overpassService.getWalkSegmentStepBarriers(
        stage.location.lat,
        stage.location.lng,
        stage.end_location.lat,
        stage.end_location.lng,
      );

    if (queryFailed) {
      sources.push('overpass_error');
    } else {
      sources.push('overpass_steps');
      if (stepFeatureCount > 0) {
        blockers.push({
          type: 'stairs_or_steps',
          severity: 'high',
          detail: `${stepFeatureCount} elemento(s) steps/stairway no OSM no corredor do trecho`,
        });
      }
      if (roughSurfaceFeatureCount > 0) {
        sources.push('overpass_rough_surface');
        blockers.push({
          type: 'rough_surface',
          severity: 'medium',
          detail: `${roughSurfaceFeatureCount} via(s) com superfície irregular mapeada (OSM) no corredor`,
        });
      }
    }

    const orsKey = `${process.env.ORS_API_KEY ?? ''}`.trim();
    let orsRoute: Awaited<
      ReturnType<OrsService['calculateRoute']>
    > | null = null;
    if (orsKey.length > 0) {
      try {
        orsRoute = await this.orsService.calculateRoute(
          stage.location.lat,
          stage.location.lng,
          stage.end_location.lat,
          stage.end_location.lng,
        );
        if (orsRoute) {
          sources.push('ors_wheelchair');
        } else {
          sources.push('ors_wheelchair_empty');
          blockers.push({
            type: 'ors_no_wheelchair_route',
            severity: 'medium',
            detail:
              'OpenRouteService (perfil wheelchair) não retornou rota entre os pontos do trecho',
          });
        }
      } catch (e) {
        sources.push('ors_error');
        this.logger.debug(`ORS Fase 2: ${(e as Error).message}`);
      }
    }

    const detourOff = ['1', 'true', 'yes'].includes(
      `${process.env.ORS_DETOUR_DISABLED ?? ''}`.trim().toLowerCase(),
    );
    if (
      !detourOff &&
      orsRoute &&
      orsKey.length > 0 &&
      orsRoute.distance_meters > 0
    ) {
      const declared = input.declaredWalkMeters;
      if (declared != null && declared > 0) {
        const ratio = readPositiveFloatEnv('ORS_DETOUR_RATIO', 1.45);
        const minExtra = readNonNegativeIntEnv('ORS_DETOUR_MIN_EXTRA_M', 50);
        const orsM = orsRoute.distance_meters;
        if (orsM >= declared * ratio && orsM - declared >= minExtra) {
          sources.push('ors_detour');
          blockers.push({
            type: 'ors_wheelchair_detour',
            severity: 'low',
            detail: `Rota wheelchair (~${Math.round(orsM)} m) excede a distância do trecho (~${Math.round(declared)} m) — possível desvio.`,
          });
        }
      }
    }

    let confidence: LegAccessibilityReport['confidence'] = 'high';
    if (queryFailed || slopePercent === null) {
      confidence = 'medium';
    }
    if (blockers.some((b) => b.type === 'rough_surface')) {
      confidence = confidence === 'high' ? 'medium' : confidence;
    }
    if (blockers.some((b) => b.type === 'ors_no_wheelchair_route')) {
      confidence = 'low';
    }

    return {
      blockers,
      confidence,
      sources,
    };
  }

  /**
   * Aplica bloqueadores estruturais ao estágio (antes do Gemini).
   * Inclinação >8% já é tratada em RoutesService com elevação; aqui só reforçamos OSM (degraus).
   */
  applyHighBlockersToStage(stage: RouteStage, report: LegAccessibilityReport): void {
    const stairs = report.blockers.find(
      (b) => b.severity === 'high' && b.type === 'stairs_or_steps',
    );
    if (!stairs) return;
    stage.accessible = false;
    stage.warning =
      stage.warning ??
      'Próximo a escadas/degraus mapeados (OpenStreetMap). Prefira companhia ou outro trajeto se não puder usar degraus.';
  }

  /** Escadas (OSM) + aviso ORS sem rota cadeira — chamar após analyzeWalkLeg. */
  applyStructuralFollowUps(stage: RouteStage, report: LegAccessibilityReport): void {
    this.applyHighBlockersToStage(stage, report);
    if (report.blockers.some((b) => b.type === 'ors_no_wheelchair_route')) {
      stage.warning =
        stage.warning ??
        'OpenRouteService (perfil cadeira) não encontrou rota contínua entre estes pontos. Prefira ir acompanhado ou confirme no local.';
    }
    if (report.blockers.some((b) => b.type === 'rough_surface')) {
      stage.warning =
        stage.warning ??
        'Trecho com calçada ou caminho de superfície irregular (OpenStreetMap). Avalie no local ou prefira companhia.';
    }
  }
}
