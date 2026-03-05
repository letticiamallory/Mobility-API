import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('avaliacoes')
export class Avaliacao {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario_id: number;

  @Column()
  local_id: number;

  @Column()
  acessivel: boolean;

  @Column({ nullable: true })
  comentario: string;

  @CreateDateColumn()
  created_at: Date;
}
