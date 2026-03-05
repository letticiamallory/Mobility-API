import { Test, TestingModule } from '@nestjs/testing';
import { RotasController } from './rotas.controller';

describe('RotasController', () => {
  let controller: RotasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RotasController],
    }).compile();

    controller = module.get<RotasController>(RotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
