import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { User } from '../users/users.entity';
import { UsersService } from '../users/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [NotificationsController],
  providers: [NotificationsService, UsersService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
