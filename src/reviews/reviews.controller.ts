import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async newReview(
    @Req() req: Request & { user: { id: number } },
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.newReview(req.user.id, body);
  }

  @Get()
  async listReviews(
    @Req() req: Request & { user: { id: number } },
    @Query('type') type: 'route' | 'station' | 'line',
    @Query('id') id: string,
  ) {
    return this.reviewsService.listReviews(type, id, req.user.id);
  }

  @Get('my')
  async myReviews(@Req() req: Request & { user: { id: number } }) {
    return this.reviewsService.myReviews(req.user.id);
  }

  @Post(':id/like')
  async toggleLike(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewsService.toggleLike(id, req.user.id);
  }

  @Delete(':id')
  async deleteReview(
    @Req() req: Request & { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewsService.deleteOwnReview(id, req.user.id);
  }
}
