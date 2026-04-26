import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lines')
export class Line {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string; // ex: "1501"

  @Column()
  name!: string; // ex: "Vila Atlantida / Vila Analia"

  @Column()
  origin!: string;

  @Column()
  destination!: string;

  @Column({ type: 'varchar', nullable: true })
  via!: string | null;

  @Column({ default: true })
  accessible!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  schedules!: string[] | null;

  @CreateDateColumn()
  created_at!: Date;
}
