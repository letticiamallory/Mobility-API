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
import { StreetViewService } from './streetview.service';
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

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);
  private hasAccompaniedColumn: boolean | null = null;

  constructor(
    @InjectRepository(Routes)
    private routesRepository: Repository<Routes>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private streetViewService: StreetViewService,
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
  ) {}

  async checkRoute(
    user_id: number,
    origin: string,
    destination: string,
    transport_type: string,
    accompanied?: string,
  ): Promise<object> {
    try {
      this.logger.log(
        `[checkRoute] payload received: ${JSON.stringify({
          user_id,
          origin,
          destination,
          transport_type,
          accompanied: accompanied ?? null,
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
        })}`,
      );

      const routeOptions =
        transport_type === 'walking'
          ? await this.getWalkingRouteOptionsWithHere(origin, destination)
          : await this.googleRoutesService.getRouteOptions(origin, destination);
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

      const analyzedRoutes: Array<
        RouteOption & {
          accessible: boolean;
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

        for (const stage of option.stages) {
          if (stage.mode === 'walking') {
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

            // Analisa 3 pontos: início, meio e fim
            const pointsToAnalyze = [
              stage.location,
              {
                lat: (stage.location.lat + stage.end_location.lat) / 2,
                lng: (stage.location.lng + stage.end_location.lng) / 2,
              },
              stage.end_location,
            ];

            for (const point of pointsToAnalyze) {
              const imageUrl = await this.streetViewService.getImage(
                point.lat,
                point.lng,
              );

              this.logger.log(`Street View URL: ${imageUrl}`);

              if (imageUrl) {
                const result =
                  await this.geminiService.analyzeAccessibility(imageUrl);
                this.logger.log(`Gemini result: ${JSON.stringify(result)}`);

                if (!result.accessible) {
                  stage.accessible = false;
                  stage.warning =
                    result.warning ??
                    'Possível obstáculo identificado nesse trecho — avalie se consegue passar ou prefira uma alternativa';
                  stage.street_view_image = imageUrl;
                  break; // Para de analisar os outros pontos se já encontrou problema
                }
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
        const weather = firstPoint
          ? await this.weatherService.getWeatherForRoute(firstPoint.lat, firstPoint.lng)
          : null;
        const accessibilityFeatures = firstPoint
          ? await this.overpassService.getAccessibilityFeatures(
              firstPoint.lat,
              firstPoint.lng,
            )
          : null;
        const wheelmapPlaces = firstPoint
          ? await this.wheelmapService.getNearbyAccessiblePlaces(
              firstPoint.lat,
              firstPoint.lng,
            )
          : [];
        const foursquarePlaces = firstPoint
          ? await this.foursquareService.getNearbyPlaces(firstPoint.lat, firstPoint.lng)
          : [];
        const nearbyAccessiblePlaces = [
          ...wheelmapPlaces,
          ...foursquarePlaces,
        ].slice(0, 20);
        const lastPoint = analyzedStages[analyzedStages.length - 1]?.end_location;
        const uberEstimates =
          firstPoint && lastPoint
            ? await this.uberService.getEstimate(firstPoint, lastPoint)
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

      const sortedRoutes = analyzedRoutes
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
            await this.notificationsService.sendRouteAlert(
              user.fcm_token,
              'Trecho com inclinacao acima de 8% identificado na rota.',
            );
          }
          if ((alertRoute.weather?.rain ?? 0) > 0) {
            await this.notificationsService.sendWeatherAlert(
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
    return this.routesRepository.find({ where: { user_id } });
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
      return this.googleRoutesService.getRouteOptions(origin, destination);
    }

    const hereRoute = await this.hereService.getAccessibleRoute(
      { lat: originCoordinates.lat, lng: originCoordinates.lon },
      { lat: destinationCoordinates.lat, lng: destinationCoordinates.lon },
    );

    if (!hereRoute) {
      return this.googleRoutesService.getRouteOptions(origin, destination);
    }

    const sections = hereRoute.sections ?? [];
    let stageNumber = 1;
    const stages: RouteStage[] = sections.map((section: any) => ({
      stage: stageNumber++,
      mode: 'walking',
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
}
