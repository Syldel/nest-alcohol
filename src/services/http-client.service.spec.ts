import { HttpClientService } from './http-client.service';
import fetch from 'node-fetch';

jest.mock('node-fetch');

describe('HttpClientService', () => {
  let httpClientService: HttpClientService;

  beforeEach(() => {
    httpClientService = new HttpClientService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return data when fetch is successful', async () => {
    const mockJson = { success: true };
    const mockHeaders = {
      get: jest.fn().mockReturnValue('application/json'),
    };

    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockJson),
      headers: mockHeaders,
    };

    (fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await httpClientService.request('https://example.com/');

    expect(result).toEqual(mockJson);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://example.com/', undefined);
  });

  it('should throw error when fetch fails', async () => {
    (fetch as unknown as jest.Mock).mockRejectedValueOnce(
      new Error('Network Error'),
    );

    jest.spyOn(console, 'error').mockImplementation();

    try {
      await httpClientService.request('https://example.com/');
    } catch (e) {
      expect(e.message).toBe('Network Error');
    }

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid JSON response', async () => {
    const mockHeaders = {
      get: jest.fn().mockReturnValue('text/html'),
    };

    const mockResponse = {
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>Error</body></html>'),
      headers: mockHeaders,
    };

    jest.spyOn(console, 'error').mockImplementation();

    (fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse);

    try {
      await httpClientService.request('https://example.com/');
    } catch (error) {
      expect(error.message).toBe('Response is not in JSON format.');
    }

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toBe(200);
  });

  it('should throw error on non-OK response', async () => {
    const mockJson = { success: false };
    const mockHeaders = {
      get: jest.fn().mockReturnValue('application/json'),
    };

    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockResolvedValue(mockJson),
      headers: mockHeaders,
    };

    jest.spyOn(console, 'error').mockImplementation();

    (fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse);

    try {
      await httpClientService.request('https://example.com/');
    } catch (error) {
      expect(error.message).toBe(
        'HTTP error! Status: 500 - Internal Server Error',
      );
    }

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).toBe(500);
  });
});
