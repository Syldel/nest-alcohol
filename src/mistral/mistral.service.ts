import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HttpClientService,
  HttpRequestInit,
} from '@services/http-client.service';
import { ELogColor, UtilsService } from '@services/utils.service';
import { AskDto } from './dto/chat.dto';

@Injectable()
export class MistralService {
  private readonly MISTRAL_API_URL = 'https://api.mistral.ai/v1';

  private mistralApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
    private readonly utilsService: UtilsService,
  ) {
    this.mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
  }

  public async chatCompletions(data: AskDto, attempt = 1): Promise<any> {
    this.utilsService.coloredLog(
      ELogColor.FgMagenta,
      `Mistral => chat completions`,
    );

    const maxRetries = 2;
    const retryDelay = 60000;

    try {
      const url = `${this.MISTRAL_API_URL}/chat/completions`;

      const headers = {
        Authorization: `Bearer ${this.mistralApiKey}`,
        'Content-Type': 'application/json',
      };

      // DOC : https://docs.mistral.ai/api/#tag/chat/operation/chat_completion_v1_chat_completions_post
      const body = {
        model: 'mistral-small-latest', // ou mistral-small, mistral-medium, mistral-large
        messages: [{ role: 'user', content: data.prompt }],
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 200,
      };

      const options: HttpRequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      };

      const response = await this.httpClient.request(url, options);

      if (!response?.choices?.length) {
        console.error(
          'Mistral API returned an unexpected response format:',
          response,
        );
        throw new Error('No choices found in Mistral response.');
      }
      return response;
    } catch (error) {
      console.error('Error during Mistral request:', error);

      if (attempt < maxRetries) {
        console.log(`Retrying... Attempt ${attempt + 1}/${maxRetries}`);
        await this.utilsService.waitSeconds(retryDelay);
        return this.chatCompletions(data, attempt + 1);
      } else {
        console.log('Max retries reached.');
        return null;
      }
    }
  }
}
