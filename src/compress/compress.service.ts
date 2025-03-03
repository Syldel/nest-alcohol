import { Injectable } from '@nestjs/common';
import * as zlib from 'zlib';

@Injectable()
export class CompressService {
  // Compression de texte en Base64
  async compress(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer.toString('base64'));
      });
    });
  }

  // Décompression de texte depuis Base64
  async decompress(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(Buffer.from(data, 'base64'), (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer.toString());
      });
    });
  }
}
