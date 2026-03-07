import { Injectable } from '@nestjs/common';

interface OrsStep {
  instruction: string;
}

interface OrsRoute {
  summary: {
    distance: number;
    duration: number;
  };
  segments: {
    steps: OrsStep[];
  }[];
}

interface OrsResponse {
  routes: OrsRoute[];
}

@Injectable()
export class OrsService {
  async calculateRoute(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number,
  ) {
    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/wheelchair',
      {
        method: 'POST',
        headers: {
          Authorization: process.env.ORS_API_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [originLon, originLat],
            [destLon, destLat],
          ],
          language: 'pt',
        }),
      },
    );

    const data = (await response.json()) as OrsResponse;

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    return {
      distance_km: (route.summary.distance / 1000).toFixed(2),
      duration_minutes: Math.ceil(route.summary.duration / 60),
      instructions: route.segments[0].steps.map(
        (step: OrsStep) => step.instruction,
      ),
    };
  }
}