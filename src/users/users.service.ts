import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { DisabilityType } from '../users/users.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

/*O injectable é o que diz pro nest.js que a nossa classe pode ser injetada em outras classes
caso contrario, nossa controller não conseguiria usar a nossa service. */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async newUser(dto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      disability_type: dto.disability_type as DisabilityType,
    });
    return this.usersRepository.save(user);
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
    const rows = (await this.usersRepository.query(
      `SELECT id, name, email, disability_type, accompanied
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    )) as Array<{
      id: number;
      name: string;
      email: string;
      disability_type: DisabilityType;
      accompanied: string;
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
      accompanied: user.accompanied,
    };
  }
}
