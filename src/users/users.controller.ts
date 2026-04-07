import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UseGuards,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async newUser(@Body() body: CreateUserDto) {
    return this.usersService.newUser(
      body.name,
      body.email,
      body.password,
      body.disability_type,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(Number(id));
  }
}
