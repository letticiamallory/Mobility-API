import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './users.entity';
import { DisabilityType } from '../users/users.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

/*O injectable é o que diz pro nest.js que a nossa classe pode ser injetada em outras classes
caso contrario, nossa controller não conseguiria usar a nossa service. */
@Injectable()
export class UsersService {
  private hasAccompaniedColumn: boolean | null = null;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async newUser(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const accompanied = dto.accompanied ?? 'both';

    if (await this.usersTableHasAccompaniedColumn()) {
      const user = this.usersRepository.create({
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        disability_type: dto.disability_type as DisabilityType,
        accompanied,
      });
      return this.usersRepository.save(user);
    }

    // Compatibilidade com banco legado sem a coluna accompanied.
    const rows = (await this.usersRepository.query(
      `INSERT INTO users (name, email, password, disability_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, disability_type, created_at`,
      [dto.name, dto.email, hashedPassword, dto.disability_type],
    )) as Array<{
      id: number;
      name: string;
      email: string;
      disability_type: DisabilityType;
      created_at: Date;
    }>;

    return {
      ...rows[0],
      accompanied,
    } as User;
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }

    return user;
  }

  async getMeById(id: number): Promise<{
    id: number;
    name: string;
    email: string;
    disability_type: DisabilityType;
    accompanied: string;
  }> {
    if (await this.usersTableHasAccompaniedColumn()) {
      const user = await this.usersRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`Usuário com id ${id} não encontrado`);
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        disability_type: user.disability_type,
        accompanied: user.accompanied ?? 'both',
      };
    }

    const rows = (await this.usersRepository.query(
      `SELECT id, name, email, disability_type
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    )) as Array<{
      id: number;
      name: string;
      email: string;
      disability_type: DisabilityType;
    }>;

    if (rows.length === 0) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }

    const user = rows[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      disability_type: user.disability_type,
      accompanied: 'both',
    };
  }

  private async usersTableHasAccompaniedColumn(): Promise<boolean> {
    if (this.hasAccompaniedColumn === true) {
      return true;
    }

    try {
      const rows = await this.usersRepository.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'accompanied'
         LIMIT 1`,
      );
      this.hasAccompaniedColumn = rows.length > 0;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        this.hasAccompaniedColumn = false;
        return false;
      }
      this.hasAccompaniedColumn = false;
    }

    return this.hasAccompaniedColumn;
  }
}
