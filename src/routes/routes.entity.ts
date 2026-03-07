import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('routes')
export class Routes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @Column()
  transport_type: string;

  @Column({ default: true })
  accessible: boolean;

  @CreateDateColumn()
  created_at: Date;
}
