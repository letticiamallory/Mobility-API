import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routes } from './routes.entity';
import { StreetViewService } from './streetview.service';
import { GeminiService } from './gemini.service';
import {
  GoogleRoutesService,
  RouteOption,
  RouteStage,
} from './google-routes.service';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @InjectRepository(Routes)
    private routesRepository: Repository<Routes>,
    private streetViewService: StreetViewService,
    private geminiService: GeminiService,
    private googleRoutesService: GoogleRoutesService,
  ) {}

  async checkRoute(
    user_id: number,
    origin: string,
    destination: string,
    transport_type: string,
    accompanied?: string,
  ): Promise<object> {
    try {
      const routeOptions = await this.googleRoutesService.getRouteOptions(
        origin,
        destination,
      );

      if (!routeOptions || routeOptions.length === 0) {
        return { message: 'No route found' };
      }

      const analyzedRoutes: (RouteOption & { accessible: boolean })[] = [];

      for (const option of routeOptions) {
        const analyzedStages: RouteStage[] = [];

        for (const stage of option.stages) {
          if (stage.mode === 'walking') {
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

        analyzedRoutes.push({
          ...option,
          stages: analyzedStages,
          accessible: routeAccessible,
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

      const bestRoute =
        sortedRoutes.find((r) => r.accessible) ?? sortedRoutes[0];

      const savedRoute = await this.routesRepository.save(
        this.routesRepository.create({
          user_id,
          origin,
          destination,
          transport_type,
          accompanied: accompanied ?? 'both',
          accessible: bestRoute.accessible,
        }),
      );

      return {
        route: savedRoute,
        routes: sortedRoutes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao calcular rota: ${message}`);
      throw new InternalServerErrorException('Erro ao calcular rota');
    }
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
}
