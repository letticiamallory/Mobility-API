import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async criar(
    @Body()
    body: {
      nome: string;
      email: string;
      senha: string;
      tipo_pcd: string;
    },
  ) {
    return this.usuariosService.criar(
      body.nome,
      body.email,
      body.senha,
      body.tipo_pcd,
    );
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(Number(id));
  }
}
