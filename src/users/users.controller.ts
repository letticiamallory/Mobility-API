import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async newUser(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      disability_type: string;
    },
  ) {
    return this.usersService.newUser(
      body.name,
      body.email,
      body.password,
      body.disability_type,
    );
  }
  // Com os : na frente do id, o nest.js entende que estamos dando um "apelido" ao id, mas que ali entra qualquer valor
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(Number(id));
  }
}
