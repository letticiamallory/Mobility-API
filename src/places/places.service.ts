import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Local } from './places.entity';

@Injectable()
export class LocaisService {
  constructor(
    @InjectRepository(Local)
    private localRepository: Repository<Local>,
  ) {}

  async novoLocal(
    nome: string,
    tipo: string,
    cidade: string,
    endereco: string,
    acessivel: boolean,
    tipo_pcd: string,
    observacao?: string,
  ): Promise<Local> {
    const local = this.localRepository.create({
      nome,
      tipo,
      cidade,
      endereco,
      acessivel,
      tipo_pcd,
      observacao,
    });
    return this.localRepository.save(local);
  }

  async listar(): Promise<Local[]> {
    return this.localRepository.find();
  }

  async buscarPorId(id: number): Promise<Local | null> {
    return this.localRepository.findOne({ where: { id } });
  }

  async atualizar(
    id: number,
    nome: string,
    tipo: string,
    cidade: string,
    endereco: string,
    acessivel: boolean,
    tipo_pcd: string,
    observacao?: string,
  ): Promise<Local | null> {
    await this.localRepository.update(id, {
      nome,
      tipo,
      cidade,
      endereco,
      acessivel,
      tipo_pcd,
      observacao,
    });
    return this.buscarPorId(id);
  }
}
