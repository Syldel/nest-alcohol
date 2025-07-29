import { Injectable } from '@nestjs/common';

import fetch, { RequestInit as FetchRequestInit } from 'node-fetch';

export type HttpRequestInfo = fetch.RequestInfo;
export type HttpRequestInit = FetchRequestInit;

@Injectable()
export class HttpClientService {
  async request(url: HttpRequestInfo, options?: HttpRequestInit): Promise<any> {
    const method = options?.method || 'GET';
    console.log(`✈ ${method}:`, url);
    try {
      const response = await fetch(url, options);

      if (response?.status === 200 || response?.status === 201) {
        console.log('✅ status:', '\x1b[32m' + response.status + '\x1b[0m');
      } else {
        console.log('❌ status:', '\x1b[31m' + response?.status + '\x1b[0m');
      }

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} - ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        throw new Error('Response is not in JSON format.');
      }
    } catch (error) {
      console.error('HTTP request error:', error);
      throw error;
    }
  }
}
