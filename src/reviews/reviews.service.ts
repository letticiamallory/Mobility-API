import { Injectable, NotFoundException } from '@nestjs/common';
import { Review } from './review.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../users/users.entity';
import { ReviewLike } from './review-like.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(ReviewLike)
    private likesRepository: Repository<ReviewLike>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async newReview(userId: number, dto: CreateReviewDto): Promise<Review> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuário com id ${userId} não encontrado`);
    }

    const review = this.reviewsRepository.create({
      user,
      type: dto.type,
      route_id: dto.route_id ?? null,
      station_id: dto.station_id ?? null,
      line_id: dto.line_id ?? null,
      rating: dto.rating,
      comment: dto.comment ?? null,
      tags: dto.tags ?? null,
      photos: dto.photos ?? null,
    });
    return this.reviewsRepository.save(review);
  }

  async getReviewById(id: number): Promise<Review> {
    const review = await this.reviewsRepository.findOne({ where: { id } });

    if (!review) {
      throw new NotFoundException(`Avaliação com id ${id} não encontrada`);
    }

    return review;
  }

  async myReviews(userId: number): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
  }

  async listReviews(type: 'route' | 'station' | 'line', id: string, meId: number) {
    const whereByType =
      type === 'route'
        ? { type, route_id: Number(id) }
        : type === 'station'
          ? { type, station_id: id }
          : { type, line_id: id };

    const reviews = await this.reviewsRepository.find({
      where: whereByType,
      order: { created_at: 'DESC' },
    });

    const reviewIds = reviews.map((review) => review.id);
    // TypeORM does not support IN for nested relation ids in this shorthand.
    const myLikedIds = reviewIds.length
      ? new Set(
          (
            await this.likesRepository
              .createQueryBuilder('like')
              .leftJoin('like.user', 'user')
              .leftJoin('like.review', 'review')
              .where('user.id = :meId', { meId })
              .andWhere('review.id IN (:...reviewIds)', { reviewIds })
              .select('review.id', 'review_id')
              .getRawMany<{ review_id: number }>()
          ).map((row) => Number(row.review_id)),
        )
      : new Set<number>();

    const total = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const review of reviews) {
      const rate = review.rating as 1 | 2 | 3 | 4 | 5;
      if (distribution[rate] !== undefined) {
        distribution[rate] += 1;
      }
    }

    return {
      average_rating: total === 0 ? 0 : Number((sum / total).toFixed(2)),
      total,
      distribution,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        tags: review.tags ?? [],
        photos: review.photos ?? [],
        likes: review.likes,
        created_at: review.created_at,
        liked_by_me: myLikedIds.has(review.id),
        user: {
          name: review.user.name,
          initials: this.getInitials(review.user.name),
        },
      })),
    };
  }

  async toggleLike(reviewId: number, userId: number) {
    const review = await this.getReviewById(reviewId);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuário com id ${userId} não encontrado`);
    }

    const existing = await this.likesRepository.findOne({
      where: {
        user: { id: userId },
        review: { id: reviewId },
      },
    });

    if (existing) {
      await this.likesRepository.remove(existing);
      await this.reviewsRepository.update(reviewId, { likes: Math.max(0, review.likes - 1) });
      return { liked: false };
    }

    const like = this.likesRepository.create({ user, review });
    await this.likesRepository.save(like);
    await this.reviewsRepository.update(reviewId, { likes: review.likes + 1 });
    return { liked: true };
  }

  async deleteOwnReview(reviewId: number, userId: number) {
    const review = await this.getReviewById(reviewId);
    if (review.user.id !== userId) {
      throw new NotFoundException('Review não encontrada para este usuário');
    }

    await this.likesRepository
      .createQueryBuilder()
      .delete()
      .from(ReviewLike)
      .where('review_id = :reviewId', { reviewId })
      .execute();
    await this.reviewsRepository.delete(reviewId);
    return { deleted: true };
  }

  private getInitials(name: string): string {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
