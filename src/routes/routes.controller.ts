import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { RotasService } from './routes.service';

@Controller('rotas')
export class RotasController {
  constructor(private rotasService: RotasService) {}

  @Post('verificar')
  async rotaAcessivel(
    @Body()
    body: {
      usuario_id: number;
      origem: string;
      destino: string;
      meio_transporte: string;
      acessivel: boolean;
    },
  ) {
    return this.rotasService.rotaAcessivel(
      body.usuario_id,
      body.origem,
      body.destino,
      body.meio_transporte,
      body.acessivel,
    );
  }

  @Get(':id')
  async buscarRotaPorId(@Param('id') id: string) {
    return this.rotasService.buscarRotaPorId(Number(id));
  }

  @Get('historico/:usuario_id')
  async buscarHistoricoRotaPorUsuarioId(
    @Param('usuario_id') usuario_id: string,
  ) {
    return this.rotasService.buscarHistoricoRotaPorUsuarioId(
      Number(usuario_id),
    );
  }
}
