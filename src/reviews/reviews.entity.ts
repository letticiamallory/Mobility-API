import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('reviews')
export class Reviews {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  place_id: number;

  @Column()
  accessible: boolean;

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  created_at: Date;
}
