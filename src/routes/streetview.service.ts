import { Injectable } from '@nestjs/common';

@Injectable()
export class StreetViewService {
  async getImage(lat: number, lon: number): Promise<string | null> {
    const apiKey = process.env.GOOGLE_API_KEY ?? '';
    const width = 640;
    const height = 640;

    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lon}&key=${apiKey}`;

    const metadataResponse = await fetch(metadataUrl);
    const metadata = (await metadataResponse.json()) as { status: string };

    if (metadata.status !== 'OK') {
      return null;
    }

    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lon}&key=${apiKey}`;

    return imageUrl;
  }
}
