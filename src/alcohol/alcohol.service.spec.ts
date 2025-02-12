import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AlcoholService } from './alcohol.service';
import { CreateAlcoholInput } from './entities/create-alcohol-input.entity';
import { Alcohol } from './entities/alcohol.entity';
import { ExploreModule } from '../services/explore.module';

describe('AlcoholService', () => {
  let module: TestingModule;
  let alcoholService: AlcoholService;
  let mockAlcoholModel: any;
  let saveMock: any;

  beforeAll(async () => {
    saveMock = jest.fn().mockResolvedValue({
      // ...validInput,
      _id: 'mockId',
    });

    // Crée un mock qui agit comme un constructeur
    mockAlcoholModel = jest.fn().mockImplementation((input) => ({
      ...input,
      save: saveMock,
    }));

    mockAlcoholModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockAlcoholModel.prototype = {
      save: jest.fn().mockResolvedValue({ _id: 'mockId' }),
    };

    module = await Test.createTestingModule({
      imports: [ExploreModule],
      providers: [
        {
          provide: getModelToken(Alcohol.name),
          useValue: mockAlcoholModel,
        },
        AlcoholService,
      ],
    }).compile();

    alcoholService = module.get<AlcoholService>(AlcoholService);
  });

  describe('create', () => {
    beforeEach(() => {
      mockAlcoholModel.findOne.mockClear();
      saveMock.mockClear();
    });

    it('should create and return new alcohol when input is valid', async () => {
      const validInput = new CreateAlcoholInput();
      validInput.asin = 'B123';
      validInput.name = 'Test Wine';

      const expectedSavedAlcohol = {
        ...validInput,
        _id: 'mockId',
      };

      saveMock = jest.fn().mockResolvedValue(expectedSavedAlcohol);

      mockAlcoholModel.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await alcoholService.create(validInput);

      expect(mockAlcoholModel.findOne).toHaveBeenCalledWith({
        asin: validInput.asin,
      });
      expect(result).toEqual(expectedSavedAlcohol);

      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(saveMock).toHaveBeenCalledWith();

      expect(mockAlcoholModel).toHaveBeenCalledWith(validInput);
    });

    it('should throw BadRequestException when input validation fails', async () => {
      const invalidInput = new CreateAlcoholInput();
      invalidInput.asin = '';
      invalidInput.name = '';

      saveMock = jest.fn().mockResolvedValue({});

      mockAlcoholModel.mockImplementation(() => ({
        save: saveMock,
      }));

      await expect(alcoholService.create(invalidInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAlcoholModel.findOne).not.toHaveBeenCalled();

      expect(saveMock).not.toHaveBeenCalled();
    });
  });
});
