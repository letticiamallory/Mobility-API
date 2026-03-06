import { Module } from '@nestjs/common';
import { AvaliacoesService } from './reviews.service';
import { AvaliacoesController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avaliacao } from './reviews.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Avaliacao])],
  providers: [AvaliacoesService],
  controllers: [AvaliacoesController],
})
export class AvaliacoesModule {}
