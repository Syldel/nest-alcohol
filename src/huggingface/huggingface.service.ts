import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HttpClientService,
  HttpRequestInit,
} from '../services/http-client.service';
import { UtilsService } from '../services/utils.service';

export enum EHFModel {
  DSLIM = 'DSLIM',
  DBMDZ = 'DBMDZ',
  CAMEMBERT = 'CAMEMBERT',
  MISTRAL = 'MISTRAL',
  ROBERTA = 'ROBERTA',
  DISTILBERT = 'DISTILBERT',
}

@Injectable()
export class HuggingFaceService {
  public readonly models = {
    DSLIM: 'dslim/bert-base-NER',
    DBMDZ: 'dbmdz/bert-large-cased-finetuned-conll03-english',
    CAMEMBERT: 'Jean-Baptiste/camembert-ner',
    MISTRAL: 'mistralai/Mistral-7B-Instruct-v0.3',
    ROBERTA: 'cardiffnlp/twitter-xlm-roberta-base-sentiment',
    DISTILBERT: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
  };
  private apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
    private readonly utilsService: UtilsService,
  ) {
    this.apiKey = this.configService.get<string>('HUGGING_FACE_API_KEY');
  }

  public async analyzeText(
    text: string,
    modelKey: EHFModel,
    attempt = 1,
  ): Promise<any> {
    console.log(
      '\x1b[35m' + `HuggingFace => analyze text with ${modelKey}` + '\x1b[0m',
    );

    const maxRetries = 3;
    const retryDelay = 60000;

    try {
      const url = `https://api-inference.huggingface.co/models/${this.models[modelKey]}`;
      const options: HttpRequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      };

      const response = await this.httpClient.request(url, options);

      return response;
    } catch (error) {
      console.error('Error during the Hugging Face API request:', error);

      if (attempt < maxRetries) {
        console.log(`Retrying... Attempt ${attempt + 1}/${maxRetries}`);
        await this.utilsService.waitSeconds(retryDelay);
        return this.analyzeText(text, modelKey, attempt + 1);
      } else {
        console.log('Max retries reached. Could not fetch data.');
        return null;
      }
    }
  }

  public extractCodeBlocks(input: any): any[] {
    if (!input) {
      return null;
    }

    let generatedText: string;
    if (typeof input === 'string') {
      generatedText = input;
    } else {
      generatedText =
        input.length > 0 ? input[0].generated_text : input?.generated_text;
    }

    if (!generatedText) {
      return null;
    }

    const jsonMatches = generatedText.match(/```[^{`]*({[\s\S]*?})[^}`]*```/gm);

    if (jsonMatches) {
      const parsedData = jsonMatches
        .map((block) => {
          // Pour chaque bloc JSON, on enlève les backticks et la balise "json"
          const jsonString = block.replace(/```json\s*|\s*```/g, '').trim();

          try {
            const dataInfo = JSON.parse(jsonString);
            return dataInfo;
          } catch (error) {
            console.error('Erreur lors du parsing du JSON:', error);
            return null;
          }
        })
        .filter((item) => item !== null);

      return parsedData;
    } else {
      return [];
    }
  }

  public transformEntities(data: { entity_group: string; word: string }[]) {
    if (!data) {
      return {};
    }

    return data.reduce(
      (acc, { entity_group, word }) => {
        if (!acc[entity_group]) {
          acc[entity_group] = [];
        }
        acc[entity_group].push(word);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }
}
