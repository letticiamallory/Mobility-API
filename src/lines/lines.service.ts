import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Repository } from 'typeorm';
import { Line } from './line.entity';

@Injectable()
export class LinesService {
  constructor(
    @InjectRepository(Line)
    private readonly linesRepository: Repository<Line>,
  ) {}

  async findAll(search?: string): Promise<Line[]> {
    const queryBuilder = this.linesRepository.createQueryBuilder('line');

    if (search?.trim()) {
      const value = `%${search.trim()}%`;
      queryBuilder.where(
        'line.code ILIKE :value OR line.name ILIKE :value OR line.origin ILIKE :value OR line.destination ILIKE :value OR line.via ILIKE :value',
        { value },
      );
    }

    return queryBuilder.orderBy('line.code', 'ASC').getMany();
  }

  async findById(id: number): Promise<Line> {
    const line = await this.linesRepository.findOne({ where: { id } });

    if (!line) {
      throw new NotFoundException(`Linha com id ${id} nao encontrada`);
    }

    return line;
  }

  async seedFromWeb(): Promise<{ saved: number; found: number }> {
    const scrapedLines = await this.scrapeLinesFromWeb();

    if (scrapedLines.length === 0) {
      return { saved: 0, found: 0 };
    }

    await this.linesRepository.upsert(scrapedLines, ['code']);

    return {
      saved: scrapedLines.length,
      found: scrapedLines.length,
    };
  }

  private async scrapeLinesFromWeb(): Promise<
    Omit<Line, 'id' | 'created_at' | 'schedules'>[]
  > {
    const { data } = await axios.get('https://www.onibusmoc.com/linhas');
    const $ = cheerio.load(data);
    const parsedLines: Omit<Line, 'id' | 'created_at' | 'schedules'>[] = [];
    const seenCodes = new Set<string>();

    $('a, li, div').each((_, element) => {
      const text = $(element).text().trim();
      const match = text.match(
        /^(\d+)\s+(.+?)\s*\/\s*(.+?)(?:\s*-\s*Via\s*(.+))?$/i,
      );

      if (!match) {
        return;
      }

      const [, code, origin, destination, via] = match;
      const normalizedCode = code.trim();

      if (seenCodes.has(normalizedCode)) {
        return;
      }

      seenCodes.add(normalizedCode);
      parsedLines.push({
        code: normalizedCode,
        name: text.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        via: via?.trim() ?? null,
        accessible: true,
      });
    });

    return parsedLines;
  }
}
