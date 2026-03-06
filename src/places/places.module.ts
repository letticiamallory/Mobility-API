import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocaisController } from './places.controller';
import { LocaisService } from './places.service';
import { Local } from './places.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Local])],
  controllers: [LocaisController],
  providers: [LocaisService],
})
export class LocaisModule {}
