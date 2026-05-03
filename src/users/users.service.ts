import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './users.entity';
import { DisabilityType } from '../users/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { AuthService } from '../auth/auth.service';

/*O injectable é o que diz pro nest.js que a nossa classe pode ser injetada em outras classes
caso contrario, nossa controller não conseguiria usar a nossa service. */
@Injectable()
export class UsersService {
  private hasAccompaniedColumn: boolean | null = null;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  async newUser(dto: CreateUserDto): Promise<{ message: string }> {
    return this.authService.register(dto);
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
    phone: string | null;
    birth_date: string | null;
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
        phone: user.phone ?? null,
        birth_date: user.birth_date ?? null,
      };
    }

    const rows = (await this.usersRepository.query(
      `SELECT id, name, email, disability_type, phone, birth_date
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    )) as Array<{
      id: number;
      name: string;
      email: string;
      disability_type: DisabilityType;
      phone: string | null;
      birth_date: string | null;
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
      phone: user.phone ?? null,
      birth_date: user.birth_date ?? null,
    };
  }

  async updateFcmToken(id: number, token: string): Promise<void> {
    await this.usersRepository.update(id, { fcm_token: token });
  }

  async updateMeById(
    id: number,
    dto: UpdateMeDto,
  ): Promise<{
    id: number;
    name: string;
    email: string;
    disability_type: DisabilityType;
    accompanied: string;
    phone: string | null;
    birth_date: string | null;
  }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) {
        throw new BadRequestException('Nome deve ter pelo menos 2 caracteres');
      }
      user.name = name;
    }

    if (dto.phone !== undefined) {
      const p = dto.phone.replace(/\u00A0/g, ' ').trim();
      user.phone = p.length > 0 ? p.slice(0, 32) : null;
    }

    if (dto.birth_date !== undefined) {
      const b = dto.birth_date.trim();
      user.birth_date = b.length > 0 ? b : null;
    }

    if (dto.disability_type !== undefined) {
      user.disability_type = dto.disability_type as DisabilityType;
    }

    if (dto.accompanied !== undefined && (await this.usersTableHasAccompaniedColumn())) {
      user.accompanied = dto.accompanied;
    }

    const saved = await this.usersRepository.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      disability_type: saved.disability_type,
      accompanied: saved.accompanied ?? 'both',
      phone: saved.phone ?? null,
      birth_date: saved.birth_date ?? null,
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
