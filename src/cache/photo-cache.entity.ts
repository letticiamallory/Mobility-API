import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('photo_cache')
export class PhotoCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  cache_key: string;

  @Column({ type: 'text' })
  photo_url: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;
}
