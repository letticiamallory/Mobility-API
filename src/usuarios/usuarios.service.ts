import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async criar(
    nome: string,
    email: string,
    senha: string,
    tipo_pcd: string,
  ): Promise<Usuario> {
    const usuario = this.usuarioRepository.create({
      nome,
      email,
      senha,
      tipo_pcd,
    });
    return this.usuarioRepository.save(usuario);
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { id } });
  }
}
