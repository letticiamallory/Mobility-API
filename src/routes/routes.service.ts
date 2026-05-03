import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Routes } from './routes.entity';
import { GeminiService } from './gemini.service';
import {
  GoogleRoutesService,
  RouteOption,
  RouteStage,
} from './google-routes.service';
import { User } from '../users/users.entity';
import { ElevationService } from '../elevation/elevation.service';
import { WeatherService } from '../weather/weather.service';
import { OverpassService } from '../accessibility/overpass.service';
import { WheelmapService } from '../accessibility/wheelmap.service';
import { FoursquareService } from '../foursquare/foursquare.service';
import { UberService } from '../uber/uber.service';
import { HereService } from '../here/here.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NominatimService } from './nominatim.service';
import { OtpService } from './otp.service';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);
  private hasAccompaniedColumn: boolean | null = null;
  private static readonly MAX_WALKING_STAGES_TO_ANALYZE = 5;

  constructor(
    @InjectRepository(Routes)
    private routesRepository: Repository<Routes>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private geminiService: GeminiService,
    private googleRoutesService: GoogleRoutesService,
    private elevationService: ElevationService,
    private weatherService: WeatherService,
    private overpassService: OverpassService,
    private wheelmapService: WheelmapService,
    private foursquareService: FoursquareService,
    private uberService: UberService,
    private hereService: HereService,
    private notificationsService: NotificationsService,
    private nominatimService: NominatimService,
    private otpService: OtpService,
  ) {}

  private parseMinutes(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number') return 0;
    const text = String(value).trim().toLowerCase();
    if (!text) return 0;
    const hours = text.match(/(\d+)\s*h/);
    const minutes = text.match(/(\d+)\s*min/);
    const asHours = hours ? Number(hours[1]) * 60 : 0;
    const asMinutes = minutes ? Number(minutes[1]) : 0;
    const parsed = asHours + asMinutes;
    if (parsed > 0) return parsed;
    const fallback = Number.parseInt(text, 10);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  private walkingMinutes(route: RouteOption): number {
    return (route.stages ?? [])
      .filter((stage) => `${stage.mode ?? ''}`.toLowerCase() === 'walk')
      .reduce((acc, stage) => acc + this.parseMinutes(stage.duration), 0);
  }

  private transferCount(route: RouteOption): number {
    const transitStages = (route.stages ?? []).filter((stage) => {
      const mode = `${stage.mode ?? ''}`.toLowerCase();
      return mode === 'bus' || mode === 'subway' || mode === 'rail';
    });
    return Math.max(0, transitStages.length - 1);
  }

  private applyRoutePreference(
    routes: RouteOption[],
    routePreference?: string,
  ): RouteOption[] {
    const normalized = `${routePreference ?? 'active'}`.trim().toLowerCase();
    if (normalized === 'less_transfers') {
      return [...routes].sort((a, b) => {
        const byTransfers = this.transferCount(a) - this.transferCount(b);
        if (byTransfers !== 0) return byTransfers;
        return this.walkingMinutes(a) - this.walkingMinutes(b);
      });
    }
    if (normalized === 'less_walking') {
      return [...routes].sort((a, b) => {
        const byWalking = this.walkingMinutes(a) - this.walkingMinutes(b);
        if (byWalking !== 0) return byWalking;
        return this.transferCount(a) - this.transferCount(b);
      });
    }
    return routes;
  }

  async checkRoute(
    user_id: number,
    origin: string,
    destination: string,
    transport_type: string,
    accompanied?: string,
    time_filter?: string,
    time_value?: string,
    route_preference?: string,
  ): Promise<object> {
    try {
      this.logger.log(
        `[checkRoute] payload received: ${JSON.stringify({
          user_id,
          origin,
          destination,
          transport_type,
          accompanied: accompanied ?? null,
          time_filter: time_filter ?? null,
          time_value: time_value ?? null,
          route_preference: route_preference ?? null,
        })}`,
      );
      const user = await this.usersRepository.findOne({ where: { id: user_id } });
      if (!user) {
        throw new NotFoundException(`Usuário com id ${user_id} não encontrado`);
      }
      this.logger.log(
        `[checkRoute] resolved user: ${JSON.stringify({
          id: user.id,
          disability_type: user.disability_type ?? null,
        })}`,
      );
      this.logger.log(
        `[checkRoute] route query params: ${JSON.stringify({
          origin,
          destination,
          transport_type,
          route_preference: route_preference ?? null,
        })}`,
      );

      const wantsWalking =
        transport_type === 'walking' ||
        transport_type === 'walk' ||
        transport_type === 'foot';

      let routeOptions: RouteOption[] | null = null;
      if (wantsWalking) {
        routeOptions = await this.getWalkingRouteOptionsWithHere(origin, destination);
      } else {
        const originCoordinates = await this.nominatimService.getCoordinates(origin);
        const destinationCoordinates =
          await this.nominatimService.getCoordinates(destination);

        if (originCoordinates && destinationCoordinates) {
          const otpRoutes = await this.otpService.planRoute(
            originCoordinates.lat,
            originCoordinates.lon,
            destinationCoordinates.lat,
            destinationCoordinates.lon,
            accompanied === 'alone',
          );
          if (otpRoutes && otpRoutes.length > 0) {
            this.logger.log('[checkRoute] OTP retornou rotas, usando resultado OTP');
            routeOptions = otpRoutes;
          }
        }

        if (!routeOptions || routeOptions.length === 0) {
          routeOptions = await this.googleRoutesService.getRouteOptions(
            origin,
            destination,
            transport_type,
            {
              timeFilter: time_filter,
              timeValue: time_value,
            },
          );
        }
      }
      this.logger.log(
        `[checkRoute] raw route options found: ${routeOptions?.length ?? 0}`,
      );

      if (!routeOptions || routeOptions.length === 0) {
        const emptyResponse = {
          route: { origin, destination },
          routes: [],
        };
        this.logger.log(
          `[checkRoute] final response: ${JSON.stringify({
            route: emptyResponse.route,
            routesCount: emptyResponse.routes.length,
          })}`,
        );
        return emptyResponse;
      }

      routeOptions = this.applyRoutePreference(routeOptions, route_preference);

      const analyzedRoutes: Array<
        RouteOption & {
          accessible: boolean;
          warning: string | null;
          accompanied_warning: string | null;
          weather: {
            condition: string | null;
            temp: number | null;
            rain: number;
            alert: string | null;
          } | null;
          accessibility_features: {
            rampas: number;
            pisotatil: number;
            banheiros_acessiveis: number;
          } | null;
          slope_warning: boolean;
          nearby_accessible_places: Array<{
            id: string | number;
            name: string;
            lat: number;
            lng: number;
            category?: string;
            wheelchair?: string;
            distance?: number;
          }>;
          uber_estimate: {
            product: string;
            estimate: string;
            duration: number;
          } | null;
          uber_deeplink: string | null;
        }
      > = [];

      for (const option of routeOptions) {
        const analyzedStages: RouteStage[] = [];
        let walkingStagesAnalyzed = 0;

        for (const stage of option.stages) {
          if (stage.mode === 'walk') {
            const urls = await this.geminiService.resolveWalkStageImageUrls(stage);
            (stage as RouteStage & { street_view_images?: string[] | null }).street_view_images =
              urls.length > 0 ? urls : null;
            stage.street_view_image = urls[0] ?? null;
          } else if (stage.mode === 'bus' || stage.mode === 'subway') {
            stage.street_view_image =
              await this.geminiService.resolveTransitStopPhoto(stage);
          } else {
            stage.street_view_image =
              await this.geminiService.resolveStageStreetViewImage(stage);
          }

          if (stage.mode === 'walk') {
            const elevations = await this.elevationService.getElevation([
              stage.location,
              stage.end_location,
            ]);
            if (elevations.length >= 2) {
              const slope = this.calculateSlopePercentage(
                elevations[0].elevation,
                elevations[1].elevation,
                stage.location,
                stage.end_location,
              );
              if (slope > 8) {
                stage.accessible = false;
                stage.warning =
                  stage.warning ??
                  `Trecho com inclinacao aproximada de ${slope.toFixed(1)}% (acima de 8%).`;
              }
            }

            // Para reduzir latência, limita análise pesada de imagem (coordenadas do meio do trecho).
            if (
              walkingStagesAnalyzed < RoutesService.MAX_WALKING_STAGES_TO_ANALYZE
            ) {
              walkingStagesAnalyzed += 1;
              const midLat =
                (stage.location.lat + stage.end_location.lat) / 2;
              const midLng =
                (stage.location.lng + stage.end_location.lng) / 2;
              this.logger.log(
                `Gemini walk segment center: ${midLat},${midLng}`,
              );

              const result =
                await this.geminiService.analyzeAccessibilityAt(midLat, midLng);
              this.logger.log(`Gemini result: ${JSON.stringify(result)}`);

              if (!result.accessible) {
                stage.accessible = false;
                stage.warning =
                  result.warning ??
                  'Possível obstáculo identificado nesse trecho — avalie se consegue passar ou prefira uma alternativa';
              }
            }
          }

          analyzedStages.push(stage);
        }

        const routeAccessible = analyzedStages.every((s) => s.accessible);
        const slope_warning = analyzedStages.some((stage) =>
          (stage.warning ?? '').includes('acima de 8%'),
        );
        const firstPoint = analyzedStages[0]?.location;
        const [weather, accessibilityFeatures, wheelmapPlaces, foursquarePlaces] =
          firstPoint
            ? await Promise.all([
                this.safeGetWeather(firstPoint.lat, firstPoint.lng),
                this.safeGetAccessibilityFeatures(firstPoint.lat, firstPoint.lng),
                this.safeGetWheelmapPlaces(firstPoint.lat, firstPoint.lng),
                this.safeGetFoursquarePlaces(firstPoint.lat, firstPoint.lng),
              ])
            : [null, null, [], []];
        const nearbyAccessiblePlaces = [
          ...wheelmapPlaces,
          ...foursquarePlaces,
        ].slice(0, 20);
        const lastPoint = analyzedStages[analyzedStages.length - 1]?.end_location;
        const uberEstimates =
          firstPoint && lastPoint
            ? await this.safeGetUberEstimates(firstPoint, lastPoint)
            : [];
        const cheapestUberEstimate =
          uberEstimates.length > 0
            ? uberEstimates.reduce((best, current) => {
                const bestValue = this.extractEstimateValue(best.estimate);
                const currentValue = this.extractEstimateValue(current.estimate);
                return currentValue < bestValue ? current : best;
              })
            : null;
        const uberDeeplink =
          firstPoint && lastPoint
            ? this.uberService.getDeepLink(firstPoint, lastPoint)
            : null;

        analyzedRoutes.push({
          ...option,
          stages: analyzedStages,
          accessible: routeAccessible,
          warning: null,
          accompanied_warning: null,
          weather,
          accessibility_features: accessibilityFeatures
            ? {
                rampas: accessibilityFeatures.rampas,
                pisotatil: accessibilityFeatures.pisotatil,
                banheiros_acessiveis: accessibilityFeatures.banheiros_acessiveis,
              }
            : null,
          slope_warning,
          nearby_accessible_places: nearbyAccessiblePlaces,
          uber_estimate: cheapestUberEstimate
            ? {
                product: cheapestUberEstimate.product,
                estimate: cheapestUberEstimate.estimate,
                duration: cheapestUberEstimate.duration,
              }
            : null,
          uber_deeplink: uberDeeplink,
        });
      }

      const sortedByAccessibilityAndDuration = analyzedRoutes
        .sort((a, b) => {
          if (a.accessible && !b.accessible) return -1;
          if (!a.accessible && b.accessible) return 1;

          const getDurationInMinutes = (duration: string): number => {
            const minutes = Number.parseInt(duration, 10);
            return Number.isNaN(minutes) ? Number.MAX_SAFE_INTEGER : minutes;
          };

          return (
            getDurationInMinutes(a.total_duration) -
            getDurationInMinutes(b.total_duration)
          );
        })
        .slice(0, 3);

      let sortedRoutes = sortedByAccessibilityAndDuration.map((route) => ({
        ...route,
        warning:
          accompanied !== 'alone' && !route.stages.every((s) => s.accessible)
            ? 'Este trajeto contém trechos com obstáculos — recomendamos ir acompanhado'
            : route.warning,
        accompanied_warning:
          accompanied === 'alone' && !route.stages.every((s) => s.accessible)
            ? 'Trecho com obstáculos — pode ser difícil sem acompanhamento'
            : null,
      }));

      if (accompanied === 'alone') {
        const fullyAccessibleRoutes = sortedRoutes.filter((route) =>
          route.stages.every((s) => s.accessible),
        );
        if (fullyAccessibleRoutes.length > 0) {
          sortedRoutes = fullyAccessibleRoutes;
        } else if (sortedRoutes.length > 0) {
          const bestAvailable = sortedRoutes[0];
          sortedRoutes = [
            {
              ...bestAvailable,
              warning:
                'Nenhuma rota totalmente acessível encontrada para este trajeto',
              accompanied_warning:
                'Trecho com obstáculos — pode ser difícil sem acompanhamento',
            },
          ];
        }
      }
      this.logger.log(
        `[checkRoute] routes after analysis/sort: ${sortedRoutes.length}`,
      );

      const bestRoute =
        sortedRoutes.find((r) => r.accessible) ?? sortedRoutes[0];

      const savedRoute = await this.saveRoute({
        user_id,
        origin,
        destination,
        transport_type,
        accompanied: accompanied ?? 'both',
        accessible: bestRoute.accessible,
      });

      const response = {
        route: savedRoute,
        routes: sortedRoutes,
      };

      if (user.fcm_token) {
        const alertRoute = sortedRoutes.find(
          (route) => route.slope_warning || (route.weather?.rain ?? 0) > 0,
        );
        if (alertRoute) {
          if (alertRoute.slope_warning) {
            await this.safeSendRouteAlert(user.fcm_token);
          }
          if ((alertRoute.weather?.rain ?? 0) > 0) {
            await this.safeSendWeatherAlert(
              user.fcm_token,
              alertRoute.weather?.condition ?? 'Chuva',
            );
          }
        }
      }
      this.logger.log(
        `[checkRoute] final response: ${JSON.stringify({
          routeId: savedRoute.id,
          routesCount: response.routes.length,
          bestRouteAccessible: bestRoute.accessible,
        })}`,
      );
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.error(
          `[checkRoute] handled HttpException: ${error.message}`,
          error.stack,
        );
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Erro ao calcular rota: ${message}`, stack);
      throw new InternalServerErrorException('Erro ao calcular rota');
    }
  }

  private async saveRoute(data: {
    user_id: number;
    origin: string;
    destination: string;
    transport_type: string;
    accompanied: string;
    accessible: boolean;
  }): Promise<Routes> {
    if (await this.routesTableHasAccompaniedColumn()) {
      return this.routesRepository.save(this.routesRepository.create(data));
    }

    // Compatibilidade com banco legado sem a coluna "accompanied".
    const rows = await this.routesRepository.query(
      `INSERT INTO routes (user_id, origin, destination, transport_type, accessible)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.user_id,
        data.origin,
        data.destination,
        data.transport_type,
        data.accessible,
      ],
    );

    const savedRoute = rows[0] as Routes;
    return {
      ...savedRoute,
      accompanied: data.accompanied,
    };
  }

  private async routesTableHasAccompaniedColumn(): Promise<boolean> {
    if (this.hasAccompaniedColumn !== null) {
      return this.hasAccompaniedColumn;
    }

    try {
      const rows = await this.routesRepository.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'routes'
           AND column_name = 'accompanied'
         LIMIT 1`,
      );
      this.hasAccompaniedColumn = rows.length > 0;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        this.logger.error(
          'Falha ao verificar schema da tabela routes; assumindo coluna accompanied ausente.',
        );
      }
      this.hasAccompaniedColumn = false;
    }

    return this.hasAccompaniedColumn;
  }

  async getRouteById(id: number): Promise<Routes> {
    const route = await this.routesRepository.findOne({ where: { id } });

    if (!route) {
      throw new NotFoundException(`Rota com id ${id} não encontrada`);
    }

    return route;
  }

  async findHistoryByUserId(user_id: number): Promise<Routes[]> {
    return this.routesRepository.find({
      where: { user_id },
      order: { created_at: 'DESC' },
    });
  }

  private calculateSlopePercentage(
    startElevation: number,
    endElevation: number,
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
  ): number {
    const horizontalDistance = this.calculateDistanceMeters(
      start.lat,
      start.lng,
      end.lat,
      end.lng,
    );
    if (horizontalDistance === 0) {
      return 0;
    }

    return (Math.abs(endElevation - startElevation) / horizontalDistance) * 100;
  }

  private calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  private extractEstimateValue(estimate: string): number {
    const numbers = estimate.replace(/[^\d,.-]/g, '').replace(',', '.');
    const value = Number.parseFloat(numbers);
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
  }

  private async getWalkingRouteOptionsWithHere(
    origin: string,
    destination: string,
  ): Promise<RouteOption[] | null> {
    const originCoordinates = await this.nominatimService.getCoordinates(origin);
    const destinationCoordinates =
      await this.nominatimService.getCoordinates(destination);

    if (!originCoordinates || !destinationCoordinates) {
      return this.googleRoutesService.getWalkingRouteOptions(
        origin,
        destination,
      );
    }

    const hereRoute = await this.hereService.getAccessibleRoute(
      { lat: originCoordinates.lat, lng: originCoordinates.lon },
      { lat: destinationCoordinates.lat, lng: destinationCoordinates.lon },
    );

    if (!hereRoute) {
      return this.googleRoutesService.getWalkingRouteOptions(
        origin,
        destination,
      );
    }

    const sections = hereRoute.sections ?? [];
    let stageNumber = 1;
    const stages: RouteStage[] = sections.map((section: any) => ({
      stage: stageNumber++,
      mode: 'walk',
      instruction:
        section.actions?.[0]?.instruction ??
        'Siga a rota de caminhada acessivel sugerida.',
      distance: `${Math.round(section.summary?.length ?? 0)} m`,
      duration: `${Math.round((section.summary?.duration ?? 0) / 60)} minutos`,
      location: {
        lat: section.departure?.place?.location?.lat ?? originCoordinates.lat,
        lng: section.departure?.place?.location?.lng ?? originCoordinates.lon,
      },
      end_location: {
        lat: section.arrival?.place?.location?.lat ?? destinationCoordinates.lat,
        lng: section.arrival?.place?.location?.lng ?? destinationCoordinates.lon,
      },
      accessible: true,
      warning: null,
      street_view_image: null,
    }));

    const totalDistanceMeters = sections.reduce(
      (acc: number, section: any) => acc + (section.summary?.length ?? 0),
      0,
    );
    const totalDurationMinutes = Math.ceil(
      sections.reduce(
        (acc: number, section: any) => acc + (section.summary?.duration ?? 0),
        0,
      ) / 60,
    );

    return [
      {
        route_id: 1,
        total_distance: `${(totalDistanceMeters / 1000).toFixed(1)} km`,
        total_duration: `${totalDurationMinutes} min`,
        stages,
      },
    ];
  }

  private async safeGetWeather(lat: number, lng: number) {
    try {
      return await this.weatherService.getWeatherForRoute(lat, lng);
    } catch (error) {
      this.logger.warn(
        `Weather indisponível para (${lat}, ${lng}): ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private async safeGetAccessibilityFeatures(lat: number, lng: number) {
    try {
      return await this.overpassService.getAccessibilityFeatures(lat, lng);
    } catch (error) {
      this.logger.warn(
        `Overpass indisponível para (${lat}, ${lng}): ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private async safeGetWheelmapPlaces(lat: number, lng: number) {
    try {
      return await this.wheelmapService.getNearbyAccessiblePlaces(lat, lng);
    } catch (error) {
      this.logger.warn(
        `Wheelmap indisponível para (${lat}, ${lng}): ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private async safeGetFoursquarePlaces(lat: number, lng: number) {
    try {
      return await this.foursquareService.getNearbyPlaces(lat, lng);
    } catch (error) {
      this.logger.warn(
        `Foursquare indisponível para (${lat}, ${lng}): ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private async safeGetUberEstimates(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) {
    try {
      return await this.uberService.getEstimate(origin, destination);
    } catch (error) {
      this.logger.warn(
        `Uber estimate indisponível: ${this.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private async safeSendRouteAlert(token: string) {
    try {
      await this.notificationsService.sendRouteAlert(
        token,
        'Trecho com inclinacao acima de 8% identificado na rota.',
      );
    } catch (error) {
      this.logger.warn(`Falha ao enviar route alert: ${this.getErrorMessage(error)}`);
    }
  }

  private async safeSendWeatherAlert(token: string, condition: string) {
    try {
      await this.notificationsService.sendWeatherAlert(token, condition);
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar weather alert: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
