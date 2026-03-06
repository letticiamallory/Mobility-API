import { Module } from '@nestjs/common';
import { RotasService } from './routes.service';
import { RotasController } from './routes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rota } from './routes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rota])],
  providers: [RotasService],
  controllers: [RotasController],
})
export class RotasModule {}
