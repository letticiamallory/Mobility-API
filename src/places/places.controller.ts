import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  ParseIntPipe,
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
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.placesService.getById(id);
  }

  @Put(':id')
  async updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePlaceDto,
  ) {
    return this.placesService.updateById(
      id,
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
