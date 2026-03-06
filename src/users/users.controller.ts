import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsuariosService } from './users.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  async novoUsuario(
    @Body()
    body: {
      nome: string;
      email: string;
      senha: string;
      tipo_pcd: string;
    },
  ) {
    return this.usuariosService.novoUsuario(
      body.nome,
      body.email,
      body.senha,
      body.tipo_pcd,
    );
  }
  // Com os : na frente do id, o nest.js entende que estamos dando um "apelido" ao id, mas que ali entra qualquer valor
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(Number(id));
  }
}
