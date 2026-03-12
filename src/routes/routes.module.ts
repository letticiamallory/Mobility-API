import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { Routes } from './routes.entity';
import { OrsService } from './ors.service';
import { NominatimService } from './nominatim.service';
import { StreetViewService } from './streetview.service';
import { GeminiService } from './gemini.service';
import { GoogleRoutesService } from './google-routes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Routes])],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    OrsService,
    NominatimService,
    StreetViewService,
    GeminiService,
    GoogleRoutesService,
  ],
})
export class RoutesModule {}
