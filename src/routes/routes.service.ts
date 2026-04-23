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
  ) {}

  async checkRoute(
    user_id: number,
    origin: string,
    destination: string,
    transport_type: string,
    accompanied?: string,
  ): Promise<object> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: user_id } });
      if (!user) {
        throw new NotFoundException(`Usuário com id ${user_id} não encontrado`);
      }

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

      const savedRoute = await this.saveRoute({
        user_id,
        origin,
        destination,
        transport_type,
        accompanied: accompanied ?? 'both',
        accessible: bestRoute.accessible,
      });

      return {
        route: savedRoute,
        routes: sortedRoutes,
      };
    } catch (error) {
      if (error instanceof HttpException) {
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
}
