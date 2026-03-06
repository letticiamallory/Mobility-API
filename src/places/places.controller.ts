import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { LocaisService } from './places.service';

@Controller('locais')
export class LocaisController {
  constructor(private readonly locaisService: LocaisService) {}

  @Post()
  async novoLocal(
    @Body()
    body: {
      nome: string;
      tipo: string;
      cidade: string;
      endereco: string;
      acessivel: boolean;
      tipo_pcd: string;
      observacao?: string;
    },
  ) {
    return this.locaisService.novoLocal(
      body.nome,
      body.tipo,
      body.cidade,
      body.endereco,
      body.acessivel,
      body.tipo_pcd,
      body.observacao,
    );
  }

  @Get()
  async listar() {
    return this.locaisService.listar();
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.locaisService.buscarPorId(Number(id));
  }

  @Put(':id')
  async atualizar(
    @Param('id') id: string,
    @Body()
    body: {
      id: number;
      nome: string;
      tipo: string;
      cidade: string;
      endereco: string;
      acessivel: boolean;
      tipo_pcd: string;
      observacao?: string;
    },
  ) {
    return this.locaisService.atualizar(
      Number(id),
      body.nome,
      body.tipo,
      body.cidade,
      body.endereco,
      body.acessivel,
      body.tipo_pcd,
      body.observacao,
    );
  }
}
