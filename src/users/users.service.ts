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
}
