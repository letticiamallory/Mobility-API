import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';

export enum ReviewType {
  ROUTE = 'route',
  STATION = 'station',
  LINE = 'line',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', nullable: true })
  route_id!: number | null;

  @Column({ type: 'varchar', nullable: true })
  station_id!: string | null;

  @Column({ type: 'varchar', nullable: true })
  line_id!: string | null;

  @Column({ type: 'enum', enum: ReviewType })
  type!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column('simple-array', { nullable: true })
  tags!: string[] | null;

  @Column('simple-array', { nullable: true })
  photos!: string[] | null;

  @Column({ default: 0 })
  likes!: number;

  @CreateDateColumn()
  created_at!: Date;
}
