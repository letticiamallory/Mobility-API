import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  async newPlace(
    @Body()
    body: {
      name: string;
      type: string;
      city: string;
      address: string;
      accessible: boolean;
      disability_type: string;
      observation?: string;
    },
  ) {
    return this.placesService.newPlace(
      body.name,
      body.type,
      body.city,
      body.address,
      body.accessible,
      body.disability_type,
      body.observation,
    );
  }

  @Get()
  async findAll() {
    return this.placesService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.placesService.getById(Number(id));
  }

  @Put(':id')
  async updateById(
    @Param('id') id: string,
    @Body()
    body: {
      id: number;
      name: string;
      type: string;
      city: string;
      address: string;
      accessible: boolean;
      disability_type: string;
      observation?: string;
    },
  ) {
    return this.placesService.updateById(
      Number(id),
      body.name,
      body.type,
      body.city,
      body.address,
      body.accessible,
      body.disability_type,
      body.observation,
    );
  }
}
