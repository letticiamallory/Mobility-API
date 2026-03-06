import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

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
    const users = this.usersRepository.create({
      name,
      email,
      password,
      disability_type,
    });
    return this.usersRepository.save(users);
  }
  // o | determina que a variavel pode ser de mais de um tipo, ou é usuario ou é null.
  async getUserById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
