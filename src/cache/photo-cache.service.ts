import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhotoCache } from './photo-cache.entity';

@Injectable()
export class PhotoCacheService {
  constructor(
    @InjectRepository(PhotoCache)
    private repo: Repository<PhotoCache>,
  ) {}

  async get(key: string): Promise<string | null> {
    const cached = await this.repo.findOne({ where: { cache_key: key } });
    if (!cached) return null;
    if (cached.expires_at && cached.expires_at < new Date()) {
      await this.repo.delete({ cache_key: key });
      return null;
    }
    return cached.photo_url;
  }

  async set(
    key: string,
    url: string,
    source: string,
    expiresInDays?: number,
  ): Promise<void> {
    const expires_at = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    await this.repo.upsert(
      { cache_key: key, photo_url: url, source, expires_at },
      ['cache_key'],
    );
  }

  buildStationKey(lat: number, lng: number): string {
    return `station_${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }

  buildStreetViewKey(lat: number, lng: number, heading: number = 0): string {
    return `streetview_${lat.toFixed(4)}_${lng.toFixed(4)}_${heading}`;
  }
}
