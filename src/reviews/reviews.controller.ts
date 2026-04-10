import { Controller, Post, Get, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async newReview(@Body() body: CreateReviewDto) {
    return this.reviewsService.newReview(
      body.user_id,
      body.place_id,
      body.accessible,
      body.comment,
    );
  }

  @Get(':id')
  async getReviewById(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewById(id);
  }
}
