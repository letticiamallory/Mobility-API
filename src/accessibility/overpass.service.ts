import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OverpassService {
  async getAccessibilityFeatures(lat: number, lng: number, radius: number = 300) {
    const query = `
      [out:json];
      (
        node["kerb"="lowered"](around:${radius},${lat},${lng});
        node["tactile_paving"="yes"](around:${radius},${lat},${lng});
        node["highway"="crossing"]["tactile_paving"="yes"](around:${radius},${lat},${lng});
        way["sidewalk"](around:${radius},${lat},${lng});
        node["amenity"="toilets"]["wheelchair"="yes"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);
    const elements = data.elements ?? [];

    return {
      rampas: elements.filter((e: any) => e.tags?.kerb === 'lowered').length,
      pisotatil: elements.filter((e: any) => e.tags?.tactile_paving === 'yes').length,
      banheiros_acessiveis: elements.filter((e: any) => e.tags?.amenity === 'toilets').length,
      calcadas: elements.filter((e: any) => e.tags?.sidewalk).length,
    };
  }
}
