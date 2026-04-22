import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum DisabilityType {
  VISUAL = 'visual',
  WHEELCHAIR = 'wheelchair',
  REDUCED_MOBILITY = 'reduced_mobility',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({ type: 'enum', enum: DisabilityType })
  disability_type!: DisabilityType;

  @CreateDateColumn()
  created_at!: Date;
}
