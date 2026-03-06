import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Routes } from './routes.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Routes)
    private routesRepository: Repository<Routes>,
  ) {}

  async checkRoute(
    usuario_id: number,
    origem: string,
    destino: string,
    meio_transporte: string,
    acessivel: boolean,
  ): Promise<Routes> {
    const routes = this.routesRepository.create({
      usuario_id,
      origem,
      destino,
      meio_transporte,
      acessivel,
    });
    return this.routesRepository.save(routes);
  }

  async getRouteById(id: number): Promise<Routes | null> {
    return this.routesRepository.findOne({ where: { id } });
  }

  async findHistoryByUserId(usuario_id: number): Promise<Routes[]> {
    return this.routesRepository.find({ where: { usuario_id } });
  }
}
