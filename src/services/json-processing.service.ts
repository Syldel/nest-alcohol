import { Injectable } from '@nestjs/common';

import * as fs from 'fs-extra';
import * as JSONStream from 'JSONStream';

@Injectable()
export class JsonProcessingService {
  public async processJsonFile(
    inputFilePath: string,
    processLine: (line: any) => any,
    targetPath = '',
  ): Promise<void> {
    targetPath = targetPath ? `${targetPath}.*` : '*';

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFilePath, {
        encoding: 'utf-8',
      });
      const jsonStream = JSONStream.parse(targetPath);

      jsonStream.on('data', (data) => {
        processLine(data);
      });

      jsonStream.on('end', resolve);
      jsonStream.on('error', reject);

      readStream.pipe(jsonStream);
    });
  }

  public async processAndWriteJson(
    inputFilePath: string,
    outputFilePath: string,
    processLine: (line: any) => any,
    targetPath = '',
  ): Promise<void> {
    const tempFilePath = `${outputFilePath}.tmp`;

    const targetJsonPath = targetPath ? `${targetPath}.*` : '*';

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFilePath, {
        encoding: 'utf-8',
      });
      const jsonStream = JSONStream.parse(targetJsonPath);
      const writeStream = fs.createWriteStream(tempFilePath);

      let firstLine = true;

      let modifiedLine: any;
      jsonStream.on('data', (data) => {
        modifiedLine = processLine(data);
        if (!firstLine) {
          writeStream.write(',\n');
        } else {
          firstLine = false;
        }
        writeStream.write(JSON.stringify(modifiedLine, null, 2));
      });

      jsonStream.on('end', async () => {
        writeStream.end();
        const originalJson = await fs.readJson(inputFilePath);
        const processedData = await fs.readFile(tempFilePath, 'utf-8');
        const modifiedArray = JSON.parse(`[${processedData}]`);
        this.setValueByPath(originalJson, targetPath, modifiedArray);
        await fs.writeJson(outputFilePath, originalJson, { spaces: 2 });
        await fs.remove(tempFilePath);
        resolve();
      });

      jsonStream.on('error', (err) => {
        reject(err);
      });

      readStream.pipe(jsonStream);
    });
  }

  public setValueByPath(obj: any, path: string, value: any) {
    if (!path) {
      Object.assign(obj, value);
      return;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();

    let target = obj;
    for (const key of keys) {
      target = target[key];
      if (!target) {
        throw new Error(`Path ${key} not found in the object`);
      }
    }

    if (lastKey) {
      target[lastKey] = value;
    }
  }
}
