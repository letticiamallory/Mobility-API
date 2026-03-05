import { Module } from '@nestjs/common';
import { RotasService } from './rotas.service';
import { RotasController } from './rotas.controller';

@Module({
  providers: [RotasService],
  controllers: [RotasController]
})
export class RotasModule {}
