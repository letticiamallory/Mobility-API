import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class GoogleRoutesService {
  private readonly logger = new Logger(GoogleRoutesService.name);

  async getRouteOptions(
    origin: string,
    destination: string,
  ): Promise<RouteOption[] | null> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY ?? '';

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=transit&alternatives=true&language=pt-BR&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Routes API error: ${response.status}`);
      }

      const data = (await response.json()) as GoogleRoutesResponse;

      if (data.status !== 'OK' || data.routes.length === 0) {
        return null;
      }

      return data.routes.map((route: TransitRoute, routeIndex: number) => {
        let stageNumber = 1;
        const stages = route.legs.flatMap((leg: TransitLeg) =>
          leg.steps.map((step: TransitStep) => ({
            stage: stageNumber++,
            mode: step.travel_mode === 'WALKING' ? 'walking' : 'transit',
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
      });
    } catch (error) {
      this.logger.error(
        `Erro no GoogleRoutesService: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
