import { Test, TestingModule } from '@nestjs/testing';
import { LocaisController } from './locais.controller';

describe('LocaisController', () => {
  let controller: LocaisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocaisController],
    }).compile();

    controller = module.get<LocaisController>(LocaisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
