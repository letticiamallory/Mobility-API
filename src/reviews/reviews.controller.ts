import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AvaliacoesService } from './reviews.service';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private avaliacoesService: AvaliacoesService) {}

  @Post()
  async novaAvaliacao(
    @Body()
    body: {
      usuario_id: number;
      local_id: number;
      acessivel: boolean;
      comentario?: string;
    },
  ) {
    return this.avaliacoesService.novaAvaliacao(
      body.usuario_id,
      body.local_id,
      body.acessivel,
      body.comentario,
    );
  }

  @Get(':id')
  async buscarAvaliacaoPorId(@Param('id') id: string) {
    return this.avaliacoesService.buscarAvaliacaoPorId(Number(id));
  }
}
