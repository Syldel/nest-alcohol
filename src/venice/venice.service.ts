import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HttpClientService,
  HttpRequestInit,
} from '@services/http-client.service';
import { ELogColor, UtilsService } from '@services/utils.service';

@Injectable()
export class VeniceService {
  private readonly VENICE_API_URL = 'https://api.venice.ai/api/v1';

  private veniceApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
    private readonly utilsService: UtilsService,
  ) {
    this.veniceApiKey = this.configService.get<string>('VENICE_API_KEY');
  }

  public async getModels(attempt = 1): Promise<any> {
    this.utilsService.coloredLog(ELogColor.FgMagenta, `Venice => Get models`);

    const maxRetries = 2;
    const retryDelay = 60000;

    try {
      const url = `${this.VENICE_API_URL}/models`;
      const options: HttpRequestInit = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.veniceApiKey}`,
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify({ inputs: text }),
      };

      const response = await this.httpClient.request(url, options);

      return response;
    } catch (error) {
      console.error('Error during Venice get models request:', error);

      if (attempt < maxRetries) {
        console.log(`Retrying... Attempt ${attempt + 1}/${maxRetries}`);
        await this.utilsService.waitSeconds(retryDelay);
        return this.getModels(attempt + 1);
      } else {
        console.log('Max retries reached. Could not fetch data.');
        return null;
      }
    }
  }

  public async chatCompletions(prompt: string, attempt = 1): Promise<any> {
    this.utilsService.coloredLog(
      ELogColor.FgMagenta,
      `Venice => Chat completions`,
    );

    const maxRetries = 2;
    const retryDelay = 60000;

    try {
      const url = `${this.VENICE_API_URL}/chat/completions`;

      const body = {
        model: 'llama-3.3-70b',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        venice_parameters: {
          enable_web_search: 'on',
          include_venice_system_prompt: true,
        },
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 1000,
        max_completion_tokens: 998,
        temperature: 1,
        top_p: 0.1,
        stream: false,
      };

      const options: HttpRequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.veniceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      };

      const response = await this.httpClient.request(url, options);
      return response;
    } catch (error) {
      console.error('Error during Venice chat completion request:', error);

      if (attempt < maxRetries) {
        console.log(`Retrying... Attempt ${attempt + 1}/${maxRetries}`);
        await this.utilsService.waitSeconds(retryDelay);
        return this.chatCompletions(prompt, attempt + 1);
      } else {
        console.log('Max retries reached. Could not complete chat.');
        return null;
      }
    }
  }
}
