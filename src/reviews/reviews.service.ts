import { Injectable } from '@nestjs/common';
import { Reviews } from './reviews.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Reviews)
    private reviewsRepository: Repository<Reviews>,
  ) {}

  async newReview(
    user_id: number,
    place_id: number,
    accessible: boolean,
    comment?: string,
  ): Promise<Reviews> {
    const review = this.reviewsRepository.create({
      user_id,
      place_id,
      accessible,
      comment,
    });
    return this.reviewsRepository.save(review);
  }

  async getReviewById(id: number): Promise<Reviews | null> {
    return this.reviewsRepository.findOne({ where: { id } });
  }
}
