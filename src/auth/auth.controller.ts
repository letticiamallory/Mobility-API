import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }): Promise<{
    access_token: string;
    user_id: number;
    name: string;
  }> {
    return this.authService.login(body.email, body.password);
  }
}
