import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { PhotoCacheModule } from '../cache/photo-cache.module';

@Module({
  imports: [PhotoCacheModule],
  controllers: [StationsController],
  providers: [StationsService],
})
export class StationsModule {}
