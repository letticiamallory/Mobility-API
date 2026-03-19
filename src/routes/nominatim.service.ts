import { Injectable } from '@nestjs/common';

interface NominatimResult {
  lat: string;
  lon: string;
}

@Injectable()
export class NominatimService {
  async getCoordinates(
    address: string,
  ): Promise<{ lat: number; lon: number } | null> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'MobilityAPI/1.0' } },
    );

    const data = (await response.json()) as NominatimResult[];

    if (data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  }
}
