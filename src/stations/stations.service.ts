import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PhotoCacheService } from '../cache/photo-cache.service';

@Injectable()
export class StationsService {
  constructor(private readonly photoCacheService: PhotoCacheService) {}

  async getStationPhoto(
    name: string,
    lat: number,
    lng: number,
  ): Promise<string | null> {
    const key = this.photoCacheService.buildStationKey(lat, lng);

    const cached = await this.photoCacheService.get(key);
    if (cached) return cached;

    const photo = await this.fetchPlacesPhoto(name, lat, lng);

    if (photo) {
      await this.photoCacheService.set(key, photo, 'places');
    }

    return photo;
  }

  private async fetchPlacesPhoto(
    name: string,
    lat: number,
    lng: number,
  ): Promise<string | null> {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
    if (!apiKey || !name.trim()) return null;

    const input = `${name.trim()} Montes Claros`;
    const url = new URL(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
    );
    url.searchParams.set('input', input);
    url.searchParams.set('inputtype', 'textquery');
    url.searchParams.set('fields', 'photos,place_id,geometry');
    url.searchParams.set('locationbias', `point:${lat},${lng}`);
    url.searchParams.set('key', apiKey);

    try {
      const { data } = await axios.get<{
        status?: string;
        candidates?: Array<{
          photos?: Array<{ photo_reference?: string }>;
        }>;
      }>(url.toString());
      if (data.status !== 'OK' || !data.candidates?.length) return null;
      const ref = data.candidates[0].photos?.[0]?.photo_reference;
      if (!ref) return null;

      const photoUrl = new URL(
        'https://maps.googleapis.com/maps/api/place/photo',
      );
      photoUrl.searchParams.set('maxwidth', '400');
      photoUrl.searchParams.set('photo_reference', ref);
      photoUrl.searchParams.set('key', apiKey);
      return photoUrl.toString();
    } catch {
      return null;
    }
  }

  async getNearby(lat: number, lng: number) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_API_KEY;
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=800&type=bus_station&key=${apiKey}`;
    const { data } = await axios.get(nearbyUrl);
    const places = data.results ?? [];

    const details = await Promise.all(
      places.map(async (place: any) => {
        const placeId = place.place_id;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,vicinity,geometry,wheelchair_accessible_entrance,rating,opening_hours&key=${apiKey}`;
        const { data: detailsData } = await axios.get(detailsUrl);
        const result = detailsData.result ?? {};

        const name = result.name ?? place.name;
        const plat = result.geometry?.location?.lat ?? place.geometry?.location?.lat;
        const plng = result.geometry?.location?.lng ?? place.geometry?.location?.lng;

        const photo =
          typeof plat === 'number' && typeof plng === 'number'
            ? await this.getStationPhoto(name, plat, plng)
            : null;

        return {
          id: placeId,
          name,
          address: result.vicinity ?? place.vicinity,
          lat: plat,
          lng: plng,
          rating: result.rating ?? place.rating,
          accessible: result.wheelchair_accessible_entrance ?? null,
          opening_hours: result.opening_hours ?? null,
          photo_url: photo,
        };
      }),
    );

    return details;
  }
}
