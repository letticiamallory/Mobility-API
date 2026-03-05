import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';

/*O injectable é o que diz pro nest.js que a nossa classe pode ser injetada em outras classes
caso contrario, nossa controller não conseguiria usar a nossa service. */
@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async novoUsuario(
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
