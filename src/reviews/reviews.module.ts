import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewLike } from './review-like.entity';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewLike, User])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
