import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reviews } from './reviews.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reviews])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
