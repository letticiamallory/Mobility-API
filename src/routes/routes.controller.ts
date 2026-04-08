import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckRouteDto } from './dto/check-route.dto';

@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  @Post('check')
  async checkRoute(@Body() body: CheckRouteDto) {
    return this.routesService.checkRoute(
      body.user_id,
      body.origin,
      body.destination,
      body.transport_type,
    );
  }

  @Get(':id')
  async getRouteById(@Param('id') id: string) {
    return this.routesService.getRouteById(Number(id));
  }

  @Get('history/:user_id')
  async findHistoryByUserId(@Param('user_id') user_id: string) {
    return this.routesService.findHistoryByUserId(Number(user_id));
  }
}
