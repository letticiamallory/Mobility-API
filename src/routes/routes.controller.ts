import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckRouteDto } from './dto/check-route.dto';

@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  private readonly logger = new Logger(RoutesController.name);

  constructor(private routesService: RoutesService) {}

  @Post('check')
  @HttpCode(200)
  async checkRoute(@Body() body: CheckRouteDto) {
    this.logger.log(
      `[checkRoute] request body: ${JSON.stringify({
        user_id: body.user_id,
        origin: body.origin,
        destination: body.destination,
        transport_type: body.transport_type,
        accompanied: body.accompanied ?? null,
      })}`,
    );
    return this.routesService.checkRoute(
      body.user_id,
      body.origin,
      body.destination,
      body.transport_type,
      body.accompanied,
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
