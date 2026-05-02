import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';

interface TransitStep {
  html_instructions: string;
  travel_mode: string;
  distance: { text: string };
  duration: { text: string; value: number };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  transit_details?: {
    line: {
      short_name: string;
      vehicle: { type: string };
    };
    departure_stop: { name: string };
    arrival_stop: { name: string };
  };
}

interface TransitLeg {
  distance: { text: string };
  duration: { text: string; value: number };
  steps: TransitStep[];
}

interface TransitRoute {
  legs: TransitLeg[];
}

interface GoogleRoutesResponse {
  routes: TransitRoute[];
  status: string;
}

export interface RouteStage {
  stage: number;
  mode: string;
  line_code?: string;
  instruction: string;
  distance: string;
  duration: string;
  location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  departure?: string;
  arrival?: string;
  accessible: boolean;
  warning: string | null;
  street_view_image: string | null;
}

export interface RouteOption {
  route_id: number;
  total_distance: string;
  total_duration: string;
  stages: RouteStage[];
}

interface MocBusLineRow {
  code: string;
  name: string;
  origin: string;
  destination: string;
  schedules: string[] | string | null;
}

@Injectable()
export class GoogleRoutesService {
  private readonly logger = new Logger(GoogleRoutesService.name);

  private resolveClockToEpoch(clockText: string): number | null {
    const normalized = clockText.trim();
    const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    return Math.floor(target.getTime() / 1000);
  }

  private buildTransitTimeParams(
    timeFilter?: string,
    timeValue?: string,
  ): string {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const normalized = (timeFilter ?? 'leave_now').trim().toLowerCase();

    if (normalized === 'leave_plus_15') {
      return `departure_time=${nowEpoch + 15 * 60}`;
    }

    if (normalized === 'last_departures_today') {
      const endOfDay = new Date();
      endOfDay.setHours(23, 0, 0, 0);
      return `departure_time=${Math.floor(endOfDay.getTime() / 1000)}`;
    }

    if (normalized === 'set_departure_time') {
      const parsed = timeValue ? this.resolveClockToEpoch(timeValue) : null;
      return `departure_time=${parsed ?? nowEpoch}`;
    }

    if (normalized === 'set_arrival_time') {
      const parsed = timeValue ? this.resolveClockToEpoch(timeValue) : null;
      return `arrival_time=${parsed ?? nowEpoch + 60 * 60}`;
    }

    return `departure_time=${nowEpoch}`;
  }

  private buildSearchTokens(origin: string, destination: string): string[] {
    const stopWords = new Set(['brasil', 'mg', 'rua', 'avenida', 'av', 'rodovia']);
    return Array.from(
      new Set(
        `${origin} ${destination}`
          .toLowerCase()
          .split(/[^a-z0-9à-ÿ]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 4 && !stopWords.has(token)),
      ),
    );
  }

  private normalizeSchedules(raw: MocBusLineRow['schedules']): string[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return [];
  }

  private mapStageMode(step: TransitStep): 'walk' | 'bus' | 'subway' {
    if (step.travel_mode === 'WALKING') {
      return 'walk';
    }

    const vehicleType = step.transit_details?.line.vehicle.type;
    if (vehicleType === 'SUBWAY') {
      return 'subway';
    }

    return 'bus';
  }

  async getRouteOptions(
    origin: string,
    destination: string,
    transportType: string = 'bus',
    options?: {
      timeFilter?: string;
      timeValue?: string;
    },
  ): Promise<RouteOption[] | null> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY ?? '';
      const transitMode =
        transportType === 'subway' ? 'subway' : 'bus|subway|train|tram';
      const transitTimeParam = this.buildTransitTimeParams(
        options?.timeFilter,
        options?.timeValue,
      );

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=transit&transit_mode=${encodeURIComponent(transitMode)}&transit_routing_preference=less_walking&${transitTimeParam}&alternatives=true&language=pt-BR&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Routes API error: ${response.status}`);
      }

      const data = (await response.json()) as GoogleRoutesResponse;

      if (data.status !== 'OK' || data.routes.length === 0) {
        this.logger.warn(
          'Google transit sem resultados; usando fallback do banco MOC BUS.',
        );
        return this.getMocBusFallbackRoutes(origin, destination);
      }

      const mappedTransitRoutes = data.routes.map(
        (route: TransitRoute, routeIndex: number) => {
          let stageNumber = 1;
          const stages = route.legs.flatMap((leg: TransitLeg) =>
            leg.steps.map((step: TransitStep) => ({
              stage: stageNumber++,
              mode: this.mapStageMode(step),
              line_code: step.transit_details?.line.short_name ?? undefined,
              instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text,
              duration: step.duration.text,
              location: step.start_location,
              end_location: step.end_location,
              departure: step.transit_details?.departure_stop.name ?? undefined,
              arrival: step.transit_details?.arrival_stop.name ?? undefined,
              accessible: true,
              warning: null,
              street_view_image: null,
            })),
          );

          const totalDurationSeconds = route.legs.reduce(
            (acc, leg) => acc + leg.duration.value,
            0,
          );
          const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);

          return {
            route_id: routeIndex + 1,
            total_distance: route.legs[0].distance.text,
            total_duration: `${totalDurationMinutes} min`,
            stages,
          };
        },
      );

      const hasTransitStages = mappedTransitRoutes.some((route) =>
        route.stages.some((stage) => stage.mode === 'bus' || stage.mode === 'subway'),
      );

      if (transportType === 'bus' && !hasTransitStages) {
        this.logger.warn(
          'Google transit retornou apenas caminhada; usando fallback do banco MOC BUS.',
        );
        return this.getMocBusFallbackRoutes(origin, destination);
      }

      return mappedTransitRoutes;
    } catch (error) {
      this.logger.error(
        `Erro no GoogleRoutesService: ${(error as Error).message}`,
      );
      return this.getMocBusFallbackRoutes(origin, destination);
    }
  }

  /** Rotas só a pé (`mode=walking`), alinhado ao que o app envia como `walk`. */
  async getWalkingRouteOptions(
    origin: string,
    destination: string,
  ): Promise<RouteOption[] | null> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY ?? '';
      if (!apiKey) {
        this.logger.warn('GOOGLE_API_KEY ausente; direções a pé indisponíveis.');
        return null;
      }
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=walking&alternatives=true&language=pt-BR&key=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Walking API error: ${response.status}`);
      }
      const data = (await response.json()) as GoogleRoutesResponse;
      if (data.status !== 'OK' || data.routes.length === 0) {
        this.logger.warn('Google walking sem resultados.');
        return null;
      }
      return data.routes.map((route: TransitRoute, routeIndex: number) => {
        let stageNumber = 1;
        const stages = route.legs.flatMap((leg: TransitLeg) =>
          leg.steps.map((step: TransitStep) => ({
            stage: stageNumber++,
            mode: 'walk',
            line_code: undefined,
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            distance: step.distance.text,
            duration: step.duration.text,
            location: step.start_location,
            end_location: step.end_location,
            departure: undefined,
            arrival: undefined,
            accessible: true,
            warning: null,
            street_view_image: null,
          })),
        );
        const totalDurationSeconds = route.legs.reduce(
          (acc, leg) => acc + leg.duration.value,
          0,
        );
        const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);
        return {
          route_id: routeIndex + 1,
          total_distance: route.legs[0].distance.text,
          total_duration: `${totalDurationMinutes} min`,
          stages,
        };
      });
    } catch (error) {
      this.logger.error(
        `Erro em getWalkingRouteOptions: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async getMocBusFallbackRoutes(
    origin: string,
    destination: string,
  ): Promise<RouteOption[] | null> {
    const client = new Client({
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5432),
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres123',
      database: process.env.DATABASE_NAME ?? 'Mobility',
    });

    try {
      await client.connect();
      const rows = (
        await client.query<MocBusLineRow>(
          `
          SELECT code, name, origin, destination, schedules
          FROM lines
          ORDER BY code ASC
          LIMIT 200
          `,
        )
      ).rows;

      if (rows.length === 0) {
        return null;
      }

      const tokens = this.buildSearchTokens(origin, destination);
      const scored = rows
        .map((line) => {
          const haystack =
            `${line.code} ${line.name} ${line.origin} ${line.destination}`.toLowerCase();
          const score = tokens.reduce(
            (acc, token) => acc + (haystack.includes(token) ? 1 : 0),
            0,
          );
          return { line, score };
        })
        .sort((a, b) => b.score - a.score);

      const bestMatches = scored.filter((item) => item.score > 0).slice(0, 3);
      const selectedLines =
        bestMatches.length > 0
          ? bestMatches.map((item) => item.line)
          : scored.slice(0, 3).map((item) => item.line);

      return selectedLines.map((line, index) => {
        const normalizedSchedules = this.normalizeSchedules(line.schedules);
        const scheduleHint =
          normalizedSchedules.length > 0
            ? `Horários: ${normalizedSchedules.slice(0, 3).join(', ')}`
            : 'Horários indisponíveis';

        const stages: RouteStage[] = [
          {
            stage: 1,
            mode: 'walk',
            instruction: `Caminhe até a linha ${line.code} (${line.name}).`,
            distance: '300 m',
            duration: '5 min',
            location: { lat: 0, lng: 0 },
            end_location: { lat: 0, lng: 0 },
            accessible: true,
            warning: null,
            street_view_image: null,
          },
          {
            stage: 2,
            mode: 'bus',
            line_code: line.code,
            instruction: `Embarque na linha ${line.code}: ${line.origin} -> ${line.destination}. ${scheduleHint}`,
            distance: 'estimado',
            duration: 'estimado',
            location: { lat: 0, lng: 0 },
            end_location: { lat: 0, lng: 0 },
            departure: line.origin,
            arrival: line.destination,
            accessible: true,
            warning: null,
            street_view_image: null,
          },
          {
            stage: 3,
            mode: 'walk',
            instruction: 'Caminhe da parada final até o destino.',
            distance: '200 m',
            duration: '4 min',
            location: { lat: 0, lng: 0 },
            end_location: { lat: 0, lng: 0 },
            accessible: true,
            warning: null,
            street_view_image: null,
          },
        ];

        return {
          route_id: index + 1,
          total_distance: 'estimado',
          total_duration: 'estimado',
          stages,
        };
      });
    } catch (error) {
      this.logger.error(
        `Fallback MOC BUS falhou: ${(error as Error).message}`,
      );
      return null;
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
