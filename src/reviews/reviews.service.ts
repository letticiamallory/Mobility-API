import { Injectable } from '@nestjs/common';
import { Avaliacao } from './reviews.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AvaliacoesService {
  constructor(private avaliacaoRepository: Repository<Avaliacao>) {}

  async novaAvaliacao(
    usuario_id: number,
    local_id: number,
    acessivel: boolean,
    comentario?: string,
  ): Promise<Avaliacao> {
    const avaliacao = this.avaliacaoRepository.create({
      usuario_id,
      local_id,
      acessivel,
      comentario,
    });
    return this.avaliacaoRepository.save(avaliacao);
  }

  async buscarAvaliacaoPorId(id: number): Promise<Avaliacao | null> {
    return this.avaliacaoRepository.findOne({ where: { id } });
  }
}
