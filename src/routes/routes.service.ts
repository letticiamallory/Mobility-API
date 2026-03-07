import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routes } from './routes.entity';
import { OrsService } from './ors.service';
import { NominatimService } from './nominatim.service';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Routes)
    private routesRepository: Repository<Routes>,
    private orsService: OrsService,
    private nominatimService: NominatimService,
  ) {}

  async checkRoute(
    user_id: number,
    origin: string,
    destination: string,
    transport_type: string,
  ): Promise<object> {
    const originCoords = await this.nominatimService.getCoordinates(origin);
    const destCoords = await this.nominatimService.getCoordinates(destination);

    if (!originCoords || !destCoords) {
      return { message: 'Origin or destination not found' };
    }

    const route = await this.orsService.calculateRoute(
      originCoords.lat,
      originCoords.lon,
      destCoords.lat,
      destCoords.lon,
    );

    if (!route) {
      await this.routesRepository.save(
        this.routesRepository.create({
          user_id,
          origin,
          destination,
          transport_type,
          accessible: false,
        }),
      );
      return { message: 'No acessible route found' };
    }

    const savedRoute = await this.routesRepository.save(
      this.routesRepository.create({
        user_id,
        origin,
        destination,
        transport_type,
        accessible: true,
      }),
    );

    return {
      route: savedRoute,
      accessible: true,
      trip: {
        distance_km: route.distance_km,
        duration_minutes: route.duration_minutes,
        instructions: route.instructions,
      },
    };
  }

  async getRouteById(id: number): Promise<Routes | null> {
    return this.routesRepository.findOne({ where: { id } });
  }

  async findHistoryByUserId(user_id: number): Promise<Routes[]> {
    return this.routesRepository.find({ where: { user_id } });
  }
}
