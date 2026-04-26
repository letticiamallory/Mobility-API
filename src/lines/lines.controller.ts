import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Line } from './line.entity';
import { LinesService } from './lines.service';

@Controller('lines')
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Get()
  async findAll(@Query('search') search?: string): Promise<Line[]> {
    return this.linesService.findAll(search);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Line> {
    return this.linesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('seed')
  async seedFromWeb() {
    return this.linesService.seedFromWeb();
  }
}
