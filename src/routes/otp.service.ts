import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RouteOption, RouteStage } from './google-routes.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_URL = process.env.OTP_URL ?? 'http://localhost:8080';

  async planRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    wheelchair = false,
    mode = 'TRANSIT,WALK',
  ): Promise<RouteOption[] | null> {
    const url =
      `${this.OTP_URL}/otp/routers/default/plan?` +
      `fromPlace=${originLat},${originLng}&` +
      `toPlace=${destLat},${destLng}&` +
      `mode=${mode}&` +
      `wheelchair=${wheelchair}&` +
      `numItineraries=3&` +
      `maxWalkDistance=1000`;

    try {
      const { data } = await axios.get(url);
      return this.mapOtpResponse(data, wheelchair);
    } catch (err) {
      this.logger.warn('[OTP] falhou, usando Google como fallback');
      return null;
    }
  }

  private mapOtpResponse(data: any, wheelchair: boolean): RouteOption[] {
    return (
      data.plan?.itineraries?.map((itinerary: any, itineraryIndex: number) => {
        const stages: RouteStage[] = (itinerary.legs ?? []).map(
          (leg: any, legIndex: number) => {
            const points = leg.legGeometry?.points
              ? this.decodePolyline(leg.legGeometry.points)
              : [];
            const startPoint = points[0] ?? {
              lat: Number(leg.from?.lat ?? 0),
              lng: Number(leg.from?.lon ?? 0),
            };
            const endPoint = points[points.length - 1] ?? {
              lat: Number(leg.to?.lat ?? 0),
              lng: Number(leg.to?.lon ?? 0),
            };

            return {
              stage: legIndex + 1,
              mode:
                leg.mode === 'WALK' ? 'walk' : leg.mode === 'BUS' ? 'bus' : 'subway',
              instruction:
                leg.mode === 'WALK'
                  ? `Caminhe até ${leg.to?.name ?? 'destino'}`
                  : `Embarque em ${leg.from?.name ?? 'ponto'} — ${leg.route ?? leg.routeShortName ?? 'linha'}`,
              distance: `${Math.round(Number(leg.distance ?? 0))}m`,
              duration: `${Math.round(Number(leg.duration ?? 0) / 60)} min`,
              accessible: !leg.slopeExceeded,
              warning: leg.slopeExceeded
                ? 'Trecho com inclinação acima de 8% — pode ser difícil'
                : null,
              line_code: leg.routeShortName ?? null,
              stop_name: leg.from?.name ?? null,
              location: { lat: Number(startPoint.lat), lng: Number(startPoint.lng) },
              end_location: { lat: Number(endPoint.lat), lng: Number(endPoint.lng) },
              departure: leg.from?.name ?? undefined,
              arrival: leg.to?.name ?? undefined,
              street_view_image: null,
            };
          },
        );

        return {
          route_id: itineraryIndex + 1,
          total_duration: `${Math.round(Number(itinerary.duration ?? 0) / 60)} minutos`,
          total_distance: this.calcDistance(itinerary.legs ?? []),
          stages,
        } as RouteOption & {
          accessible: boolean;
          slope_warning: boolean;
          accompanied_warning: string | null;
        };
      }) ?? []
    );
  }

  private calcDistance(legs: any[]): string {
    const total = legs.reduce(
      (acc: number, l: any) => acc + Number(l.distance ?? 0),
      0,
    );
    return total > 1000 ? `${(total / 1000).toFixed(1)} km` : `${Math.round(total)}m`;
  }

  private decodePolyline(encoded: string): { lat: number; lng: number }[] {
    const points: { lat: number; lng: number }[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
  }
}
