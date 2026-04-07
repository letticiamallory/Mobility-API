import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';

@UseGuards(JwtAuthGuard)
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  async newPlace(@Body() body: CreatePlaceDto) {
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
    @Body() body: UpdatePlaceDto, // ← atualizado
  ) {
    return this.placesService.updateById(
      Number(id),
      body.name!,
      body.type!,
      body.city!,
      body.address!,
      body.accessible!,
      body.disability_type!,
      body.observation!,
    );
  }
}
