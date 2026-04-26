import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('register')
  async registerToken(
    @Req() req: Request & { user: { id: number } },
    @Body() body: { token: string },
  ) {
    await this.usersService.updateFcmToken(req.user.id, body.token);
    return { success: true };
  }

  @Post('test')
  async sendTest(
    @Req() req: Request & { user: { id: number } },
    @Body() body: { token: string; title: string; body: string },
  ) {
    const title = body.title ?? 'Teste de Notificacao';
    const message = body.body ?? `Push de teste para usuario ${req.user.id}`;
    await this.notificationsService.sendPush(body.token, title, message, {
      type: 'test',
    });
    return { success: true };
  }
}
