import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class StationsService {
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

        return {
          id: placeId,
          name: result.name ?? place.name,
          address: result.vicinity ?? place.vicinity,
          lat: result.geometry?.location?.lat ?? place.geometry?.location?.lat,
          lng: result.geometry?.location?.lng ?? place.geometry?.location?.lng,
          rating: result.rating ?? place.rating,
          accessible: result.wheelchair_accessible_entrance ?? null,
          opening_hours: result.opening_hours ?? null,
        };
      }),
    );

    return details;
  }
}
