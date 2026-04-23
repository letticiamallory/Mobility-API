import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user_id: number; name: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) throw new UnauthorizedException('Email ou senha inválidos');

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      throw new UnauthorizedException('Email ou senha inválidos');

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    const loggedUser = await this.usersRepository.findOne({ where: { email } });

    if (!loggedUser) throw new UnauthorizedException('Email ou senha inválidos');

    return { access_token, user_id: loggedUser.id, name: loggedUser.name };
  }
}
