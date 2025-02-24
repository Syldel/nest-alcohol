import * as fs from 'fs-extra';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonService {
  public async readJsonFile(fileName: string): Promise<any> {
    const filePath = path.join(process.cwd(), fileName);
    console.log('¤ readJsonFile', filePath);

    try {
      const data = await fs.readJson(filePath);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  public async writeJsonFile(
    fileName: string,
    objectToWrite: any,
  ): Promise<boolean> {
    const filePath = path.join(process.cwd(), fileName);
    console.log('+ writeJsonFile', filePath);

    const nowDate = new Date();
    objectToWrite.jsonCreatedAtDate = nowDate.toLocaleDateString();
    objectToWrite.jsonCreatedAtTime = nowDate.getTime();

    try {
      await fs.writeJson(filePath, objectToWrite, { spaces: 2 });
    } catch (err) {
      console.error(err);
      return false;
    }

    return true;
  }

  public async removeFile(fileName: string): Promise<boolean> {
    const filePath = path.join(process.cwd(), fileName);
    console.log('- removeFile', filePath);

    try {
      await fs.remove(filePath);
    } catch (err) {
      console.error(err);
      return false;
    }

    return true;
  }
}
