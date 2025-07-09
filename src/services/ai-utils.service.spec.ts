import { Test, TestingModule } from '@nestjs/testing';

import { AiUtilsService } from './ai-utils.service';

describe('AiUtilsService', () => {
  let app: TestingModule;
  let aiUtilsService: AiUtilsService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [],
      providers: [AiUtilsService],
    }).compile();

    aiUtilsService = app.get<AiUtilsService>(AiUtilsService);
  });

  describe('extractCodeBlocks', () => {
    it('should extract and parse Object with JSON in code blocks - with line breaks', () => {
      const input = [
        {
          generated_text:
            'Here is the country information:\n```json\n{"name":{"en":"France","fr":"France"},"cca2":"FR","cca3":"FRA","flag":"🇫🇷"}\n```',
        },
      ];

      const result = aiUtilsService.extractCodeBlocks(input);

      expect(result).toEqual([
        {
          name: {
            en: 'France',
            fr: 'France',
          },
          cca2: 'FR',
          cca3: 'FRA',
          flag: '🇫🇷',
        },
      ]);
    });

    it('should extract and parse Object with JSON in code blocks - without line breaks', () => {
      const generated_text =
        'Le pays correspondant à la distillerie de Togouchi Premium Whisky Japonais est le Japon avec ces codes : ' +
        '```json' +
        '{' +
        '  "name": {' +
        '    "en": "Japan",' +
        '    "fr": "Japon"' +
        '  },' +
        '  "cca2": "JP",' +
        '  "cca3": "JPN",' +
        '  "flag": "🇯🇵",' +
        '  "sub": null' +
        '}' +
        '```';
      const input = [
        {
          generated_text,
        },
      ];

      const result = aiUtilsService.extractCodeBlocks(input);

      expect(result).toEqual([
        {
          name: {
            en: 'Japan',
            fr: 'Japon',
          },
          cca2: 'JP',
          cca3: 'JPN',
          flag: '🇯🇵',
          sub: null,
        },
      ]);
    });

    it('should return {} when input is ```json {}```', () => {
      const input = [
        {
          generated_text: '```json {}```',
        },
      ];

      const result = aiUtilsService.extractCodeBlocks(input);

      expect(result).toEqual([{}]);
    });

    it('should return ? when input when there are 2 code blocks', () => {
      const input = [
        {
          generated_text:
            '```json {}``` AND ```json\n{"name":{"en":"France","fr":"France"},"cca2":"FR","cca3":"FRA","flag":"🇫🇷"}\n```',
        },
      ];

      const result = aiUtilsService.extractCodeBlocks(input);

      expect(result).toEqual([
        {},
        {
          name: { en: 'France', fr: 'France' },
          cca2: 'FR',
          cca3: 'FRA',
          flag: '🇫🇷',
        },
      ]);
    });

    it('should return null when input is null or undefined', () => {
      const nullResult = aiUtilsService.extractCodeBlocks(null);
      expect(nullResult).toBeNull();

      const undefinedResult = aiUtilsService.extractCodeBlocks(undefined);
      expect(undefinedResult).toBeNull();
    });
  });

  describe('mergeWithTolerance', () => {
    it('merges two strings with perfect overlap', () => {
      const s1 = 'abc def ghi jkl';
      const s2 = 'ghi jkl mno pqr';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('abc def ghi jkl mno pqr');
    });

    it('returns concatenation if no overlap', () => {
      const s1 = 'hello world';
      const s2 = 'goodbye moon';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('hello world goodbye moon');
    });

    it('ignores small mismatches at start and end with tolerance', () => {
      const s1 = 'abc def ghi jkl extra noise';
      const s2 = 'noise ghi jkl mno pqr';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('abc def ghi jkl mno pqr');
    });

    it('ignores small mismatches at start and end with tolerance - inverted', () => {
      const s1 = 'noise ghi jkl mno pqr';
      const s2 = 'abc def ghi jkl extra noise';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('noise ghi jkl extra noise');
    });

    it('merges when overlap is at the very end and start', () => {
      const s1 = 'overlap test string end';
      const s2 = 'string end and more text';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('overlap test string end and more text');
    });

    it('handles empty strings', () => {
      expect(aiUtilsService.mergeWithTolerance('', '')).toBe('');
      expect(aiUtilsService.mergeWithTolerance('abc', '')).toBe('abc');
      expect(aiUtilsService.mergeWithTolerance('', 'def')).toBe('def');
    });

    it('returns s1 + s2 if overlap is zero', () => {
      const s1 = 'abcdef';
      const s2 = 'ghijkl';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('abcdef ghijkl');
    });

    it('merges with ***', () => {
      const s1 = 'some text with trailing noise ***';
      const s2 = '*** with trailing noise and more';
      const result = aiUtilsService.mergeWithTolerance(s1, s2);
      expect(result).toBe('some text with trailing noise and more');
    });

    it('merges strings with partial overlaps - with ```json', () => {
      const input = [
        `et juteux évolue vers une finale légère sur l'amande et la noisette.</p>",\n  "description": "<p>Créée en 2015, l’entreprise Les Bienheureux révolutionne `,
        ` '\`\`\`json\n  "description": "<p>Créée en 2015, l’entreprise Les Bienheureux révolutionne le milieu des alcools et spiritueux par son esprit d’innovation, son souci d’excellence, ses valeurs éthiques`,
      ];

      const expected = `et juteux évolue vers une finale légère sur l'amande et la noisette.</p>", "description": "<p>Créée en 2015, l’entreprise Les Bienheureux révolutionne le milieu des alcools et spiritueux par son esprit d’innovation, son souci d’excellence, ses valeurs éthiques`;
      expect(aiUtilsService.mergeWithTolerance(input[0], input[1])).toBe(
        expected,
      );
    });

    it('merges overlapping completions - simple inputs', () => {
      const input = [
        'Le whisky est produit en Écosse. Il est connu pour sa richesse',
        'Il est connu pour sa richesse en arômes et sa complexité.',
      ];
      const expected =
        'Le whisky est produit en Écosse. Il est connu pour sa richesse en arômes et sa complexité.';
      expect(aiUtilsService.mergeWithTolerance(input[0], input[1])).toBe(
        expected,
      );
    });
  });

  describe('mergeAllWithTolerance', () => {
    it('merges multiple fragments with overlap using mergeAllWithTolerance', () => {
      const fragments = [
        'abc def ghi jkl extra noise',
        'noise ghi jkl mno pqr',
        'mno pqr stu vwx',
        'stu vwx yz the-end',
      ];

      const result = aiUtilsService.mergeAllWithTolerance(fragments);
      expect(result).toBe('abc def ghi jkl mno pqr stu vwx yz the-end');
    });

    it('merges strings with partial overlaps', () => {
      const inputs = [
        '<p>Créée en 2015, l’entreprise Les Bienheureux révolutionne le milieu des alcools',
        'révolutionne le milieu des alcools et spiritueux par son esprit d’innovation',
        'par son esprit d’innovation, son souci d’excellence, ses valeurs éthiques',
      ];

      const expected =
        '<p>Créée en 2015, l’entreprise Les Bienheureux révolutionne le milieu des alcools et spiritueux par son esprit d’innovation, son souci d’excellence, ses valeurs éthiques';

      expect(aiUtilsService.mergeAllWithTolerance(inputs)).toBe(expected);
    });

    it('should merge multiple JSON fragments correctly', () => {
      const fragments = [
        '```json\n' +
          '{\n' +
          '  "metaTitle": "Bellevoye Blanc",\n' +
          `  "metaDescription": "Whisky français triple malt",\n` +
          `  "about": "<p>UN WHISKY TRIPLE MALT FRANÇAIS : 100 % français et salué par la critique au niveau international</p>",\n` +
          '  "description": "<p>Phrase1. Phrase2.</p><p>Phrase3. Phrase4.</p><p>Debut de phrase',
        '```json\n' +
          '  "description": "<p>Phrase1. Phrase2.</p><p>Phrase3. Phrase4.</p><p>Debut de phrase Suite Phrase.</p><p>Dernière phrase.</p>",\n' +
          '  "producer": "<p>Lancé il y a six ans en circuit traditionnel, le whisky Bellevoye est servi à l’Élysée et sur les vols Air France.</p>"\n' +
          '}\n' +
          '```',
      ];

      const expectedMerged =
        '```json' +
        ' {' +
        ' "metaTitle": "Bellevoye Blanc",' +
        ` "metaDescription": "Whisky français triple malt",` +
        ` "about": "<p>UN WHISKY TRIPLE MALT FRANÇAIS : 100 % français et salué par la critique au niveau international</p>",` +
        ' "description": "<p>Phrase1. Phrase2.</p><p>Phrase3. Phrase4.</p><p>Debut de phrase Suite Phrase.</p><p>Dernière phrase.</p>",' +
        ' "producer": "<p>Lancé il y a six ans en circuit traditionnel, le whisky Bellevoye est servi à l’Élysée et sur les vols Air France.</p>"' +
        ' } ' +
        '```';

      const result = aiUtilsService.mergeAllWithTolerance(fragments);

      const descriptionMatches = result.match(/"description"\s*:/g) || [];
      expect(descriptionMatches.length).toBe(1);

      const jsonBlockMatches = result.match(/```json[\s\S]*?```/g) || [];
      expect(jsonBlockMatches.length).toBe(1);

      expect(result).toBe(expectedMerged);
    });

    it('should merge multiple JSON fragments correctly - with array in json', () => {
      const fragments = [
        '```json\n' +
          '{\n' +
          '  "details": [\n' +
          '    { "legend": "Marque", "value": "Bellevoye" },\n' +
          '    { "legend": "Type", "value": "Whisky Triple Malt" },\n' +
          '    { "legend": "Volume", "value": "70 cl" },\n' +
          '    { "legend": "Degré", "value": "40%" },\n' +
          '    { "legend": "Saveur", "value": "Fruits secs, épices, miel" },\n' +
          '    { "legend": "Pays", "value": "France" },\n' +
          '    { "legend": "Sp',
        '```json\n' +
          '    { "legend": "Spécificité", "value": "Affiné en fût de Sauternes" },\n' +
          `    { "legend": "Récompenses", "value": "Médailles d'or internationales" }\n` +
          '  ]\n' +
          '}\n' +
          '```',
      ];

      const expectedMerged =
        '```json' +
        ' {' +
        ' "details": [' +
        ' { "legend": "Marque", "value": "Bellevoye" },' +
        ' { "legend": "Type", "value": "Whisky Triple Malt" },' +
        ' { "legend": "Volume", "value": "70 cl" },' +
        ' { "legend": "Degré", "value": "40%" },' +
        ' { "legend": "Saveur", "value": "Fruits secs, épices, miel" },' +
        ' { "legend": "Pays", "value": "France" },' +
        ' { "legend": "Spécificité", "value": "Affiné en fût de Sauternes" },' +
        ` { "legend": "Récompenses", "value": "Médailles d'or internationales" }` +
        ' ]' +
        ' } ' +
        '```';

      const result = aiUtilsService.mergeAllWithTolerance(fragments);

      const descriptionMatches = result.match(/"details"\s*:/g) || [];
      expect(descriptionMatches.length).toBe(1);

      const jsonBlockMatches = result.match(/```json[\s\S]*?```/g) || [];
      expect(jsonBlockMatches.length).toBe(1);

      expect(result).toBe(expectedMerged);
    });

    it('should merge multiple JSON fragments correctly - with array in json - 2', () => {
      const fragments = [
        '```json\n' +
          '{\n' +
          '  "details": [\n' +
          '    { "legend": "Marque", "value": "Dalwhinnie"',
        '```json\n' +
          '{ "legend": "Marque", "value": "Dalwhinnie" },\n' +
          '{ "legend": "Type", "value": "Whisky Single Malt" },\n' +
          '{ "legend": "Volume", "value": "70 cl" }\n' +
          '  ]\n' +
          '}\n' +
          '```',
      ];

      const expectedMerged =
        '```json' +
        ' {' +
        ' "details": [' +
        ' { "legend": "Marque", "value": "Dalwhinnie" },' +
        ' { "legend": "Type", "value": "Whisky Single Malt" },' +
        ' { "legend": "Volume", "value": "70 cl" }' +
        ' ]' +
        ' } ' +
        '```';

      const result = aiUtilsService.mergeAllWithTolerance(fragments);

      const descriptionMatches = result.match(/"details"\s*:/g) || [];
      expect(descriptionMatches.length).toBe(1);

      const jsonBlockMatches = result.match(/```json[\s\S]*?```/g) || [];
      expect(jsonBlockMatches.length).toBe(1);

      expect(result).toBe(expectedMerged);
    });
  });
});
