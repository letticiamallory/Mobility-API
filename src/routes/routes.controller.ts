import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
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
  async getRouteById(@Param('id', ParseIntPipe) id: number) {
    return this.routesService.getRouteById(id);
  }

  @Get('history/:user_id')
  async findHistoryByUserId(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.routesService.findHistoryByUserId(user_id);
  }
}
