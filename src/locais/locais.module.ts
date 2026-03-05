import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocaisController } from './locais.controller';
import { LocaisService } from './locais.service';
import { Local } from './local.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Local])],
  controllers: [LocaisController],
  providers: [LocaisService],
})
export class LocaisModule {}
