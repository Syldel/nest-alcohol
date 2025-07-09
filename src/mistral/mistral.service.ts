import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HttpClientService,
  HttpRequestInit,
} from '@services/http-client.service';
import { ELogColor, UtilsService } from '@services/utils.service';
import { AskDto } from './dto/chat.dto';
import { AiUtilsService } from '@services/ai-utils.service';

@Injectable()
export class MistralService {
  private readonly MISTRAL_API_URL = 'https://api.mistral.ai/v1';

  private mistralApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
    private readonly utilsService: UtilsService,
    private readonly aiUtilsService: AiUtilsService,
  ) {
    this.mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
  }

  public async chatCompletions(
    data: AskDto,
    attempt = 1,
  ): Promise<{ fullContent: string; rawResponses: any[] }> {
    this.utilsService.coloredLog(
      ELogColor.FgMagenta,
      `Mistral => chat completions`,
    );

    const maxRetries = 2;
    const retryDelay = 2 * 60000;
    const maxRounds = 9;

    const url = `${this.MISTRAL_API_URL}/chat/completions`;
    const headers = {
      Authorization: `Bearer ${this.mistralApiKey}`,
      'Content-Type': 'application/json',
    };

    const messages = [{ role: 'user', content: data.prompt }];
    const rawResponses = [];

    let fullContent = '';
    let finishReason = 'length';
    let round = 0;
    let maxTokens = data.max_tokens ?? 500;

    try {
      while (finishReason === 'length' && round < maxRounds) {
        const body = {
          model: 'mistral-small-latest',
          messages,
          temperature: data.temperature ?? 0.7,
          max_tokens: maxTokens,
        };

        const options: HttpRequestInit = {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        };

        const response = await this.httpClient.request(url, options);
        rawResponses.push(response);

        const choice = response?.choices?.[0];
        if (!choice?.message?.content) {
          throw new Error('Empty response content from Mistral.');
        }

        const content = choice.message.content;
        finishReason = choice.finish_reason;

        messages.push({ role: 'assistant', content });
        if (finishReason === 'length') {
          if (maxTokens < 3000) {
            messages.push({
              role: 'user',
              content: 'Answer again to the inital prompt',
            });
            maxTokens += 500;
          } else {
            messages.push({
              role: 'user',
              content:
                'Continue the previous response starting exactly where it stopped. Make sure to repeat the last 10 words before continuing, but do not repeat the entire previous message.',
            });
          }

          await this.utilsService.waitSeconds(5000);
        }

        round++;
      }

      const contents = rawResponses
        .map((r) => r?.choices?.[0]?.message?.content)
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '');

      fullContent = this.aiUtilsService.mergeAllWithTolerance(contents);

      return { fullContent, rawResponses };
    } catch (error) {
      console.error('Error during Mistral request:', error);

      if (attempt < maxRetries) {
        console.log(`Retrying... Attempt ${attempt + 1}/${maxRetries}`);
        await this.utilsService.waitSeconds(retryDelay);
        return this.chatCompletions(data, attempt + 1);
      } else {
        console.log('Max retries reached.');
        return { fullContent, rawResponses };
      }
    }
  }
}
