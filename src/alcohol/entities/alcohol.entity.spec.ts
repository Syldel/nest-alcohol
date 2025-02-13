import { Alcohol } from './alcohol.entity';
import {
  CreateAlcoholInput,
  validateCreateAlcoholInput,
} from './create-alcohol-input.entity';

import { validate } from 'class-validator';

describe('Alcohol et CreateAlcoholInput', () => {
  describe('Alcohol', () => {
    it('devrait être défini', () => {
      expect(Alcohol).toBeDefined();
    });
  });

  describe('CreateAlcoholInput', () => {
    let input: CreateAlcoholInput;

    it('devrait être défini', () => {
      expect(CreateAlcoholInput).toBeDefined();
    });

    describe('asin cases', () => {
      beforeEach(() => {
        input = new CreateAlcoholInput();
        input.name = 'Test name';
      });

      it('devrait provoquer une erreur si asin est undefined', async () => {
        const errors = await validate(input);
        expect(errors.length).toBe(1);
        expect(errors[0].constraints).toEqual({
          isDefined: 'asin should not be null or undefined',
          isNotEmpty: 'asin is required',
          isString: 'asin must be a string',
        });
      });

      it('devrait provoquer une erreur si asin est une chaîne vide', async () => {
        input.asin = '';
        const errors = await validate(input);
        expect(errors.length).toBe(1);
        expect(errors[0].constraints).toEqual({
          isNotEmpty: 'asin is required',
        });
      });

      it('ne devrait pas provoquer une erreur si asin est présent', async () => {
        input.asin = 'test_asin';
        const errors = await validate(input);
        expect(errors.length).toBe(0);
      });
    });

    describe('name cases', () => {
      beforeEach(() => {
        input = new CreateAlcoholInput();
        input.asin = 'B07BPLMSMC';
      });

      it('devrait provoquer une erreur si name est undefined', async () => {
        const errors = await validate(input);
        expect(errors.length).toBe(1);
        expect(errors[0].constraints).toEqual({
          isDefined: 'name should not be null or undefined',
          isNotEmpty: 'name is required',
          isString: 'name must be a string',
        });
      });

      it('devrait provoquer une erreur si name est une chaîne vide', async () => {
        input.name = '';
        const errors = await validate(input);
        expect(errors.length).toBe(1);
        expect(errors[0].constraints).toEqual({
          isNotEmpty: 'name is required',
        });
      });

      it('ne devrait pas provoquer une erreur si name est présent', async () => {
        input.name = 'Test name';
        const errors = await validate(input);
        expect(errors.length).toBe(0);
      });
    });

    fdescribe('validateCreateAlcoholInput', () => {
      it('should return empty array when input is valid', async () => {
        const validInput = {
          asin: 'B07BPLMSMC',
          name: 'Test Alcohol',
        };

        const errors = await validateCreateAlcoholInput(validInput);

        expect(errors).toHaveLength(0);
      });

      fit('should return validation errors when asin is missing', async () => {
        const input = {
          asin: undefined,
          name: 'Test Alcohol',
        };

        const errors = await validateCreateAlcoholInput(input);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toEqual({
          isDefined: 'asin should not be null or undefined',
          isNotEmpty: 'asin is required',
          isString: 'asin must be a string',
        });
      });

      it('should return validation errors when name is missing', async () => {
        const input = {
          asin: 'ASIN1234',
          name: undefined,
        };

        const errors = await validateCreateAlcoholInput(input);

        expect(errors).toHaveLength(1);
        expect(errors[0].constraints).toEqual({
          isDefined: 'name should not be null or undefined',
          isNotEmpty: 'name is required',
          isString: 'name must be a string',
        });
      });
    });
  });
});
