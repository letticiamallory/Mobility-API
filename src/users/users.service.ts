import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import * as bcrypt from 'bcrypt';

/*O injectable é o que diz pro nest.js que a nossa classe pode ser injetada em outras classes
caso contrario, nossa controller não conseguiria usar a nossa service. */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async newUser(
    name: string,
    email: string,
    password: string,
    disability_type: string,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const users = this.usersRepository.create({
      name,
      email,
      password: hashedPassword,
      disability_type,
    });
    return this.usersRepository.save(users);
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado`);
    }

    return user;
  }
}
