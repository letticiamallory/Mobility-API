import { Injectable } from '@nestjs/common';
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

  async getById(id: number): Promise<Places | null> {
    return this.placesRepository.findOne({ where: { id } });
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
  ): Promise<Places | null> {
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
