import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async newReview(
    @Body()
    body: {
      user_id: number;
      place_id: number;
      accessible: boolean;
      comment?: string;
    },
  ) {
    return this.reviewsService.newReview(
      body.user_id,
      body.place_id,
      body.accessible,
      body.comment,
    );
  }

  @Get(':id')
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(Number(id));
  }
}
