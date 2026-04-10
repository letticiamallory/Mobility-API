import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Places } from './places.entity';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Places)
    private placesRepository: Repository<Places>,
  ) {}

  async newPlace(
    name: string,
    type: string,
    city: string,
    address: string,
    accessible: boolean,
    disability_type: string,
    observation?: string,
  ): Promise<Places> {
    const place = this.placesRepository.create({
      name,
      type,
      city,
      address,
      accessible,
      disability_type,
      observation,
    });
    return this.placesRepository.save(place);
  }

  async findAll(): Promise<Places[]> {
    return this.placesRepository.find();
  }

  async getById(id: number): Promise<Places> {
    const place = await this.placesRepository.findOne({ where: { id } });

    if (!place) {
      throw new NotFoundException(`Local com id ${id} não encontrado`);
    }

    return place;
  }

  async updateById(
    id: number,
    name: string,
    type: string,
    city: string,
    address: string,
    accessible: boolean,
    disability_type: string,
    observation?: string,
  ): Promise<Places> {
    await this.placesRepository.update(id, {
      name,
      type,
      city,
      address,
      accessible,
      disability_type,
      observation,
    });
    return this.getById(id);
  }
}
