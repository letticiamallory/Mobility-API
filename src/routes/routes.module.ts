import { Module } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Routes } from './routes.entity';
import { OrsService } from './ors.service';
import { NominatimService } from './nominatim.service';

@Module({
  imports: [TypeOrmModule.forFeature([Routes])],
  providers: [RoutesService, OrsService, NominatimService],
  controllers: [RoutesController],
})
export class RoutesModule {}
