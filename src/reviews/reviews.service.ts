import { Injectable, NotFoundException } from '@nestjs/common';
import { Reviews } from './reviews.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Reviews)
    private reviewsRepository: Repository<Reviews>,
  ) {}

  async newReview(dto: CreateReviewDto): Promise<Reviews> {
    const review = this.reviewsRepository.create(dto);
    return this.reviewsRepository.save(review);
  }

  async getReviewById(id: number): Promise<Reviews> {
    const review = await this.reviewsRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Avaliação com id ${id} não encontrada`);
    }

    return review;
  }
}
