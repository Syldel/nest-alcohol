import { Injectable } from '@nestjs/common';

import { firstValueFrom, take, timer } from 'rxjs';

export enum ELogColor {
  FgRed = 'FgRed',
  FgGreen = 'FgGreen',
  FgYellow = 'FgYellow',
  FgBlue = 'FgBlue',
  FgMagenta = 'FgMagenta',
  FgCyan = 'FgCyan',
}

@Injectable()
export class UtilsService {
  public coloredText(color: ELogColor, text: string): string {
    let prefix = '';
    switch (color) {
      case ELogColor.FgRed:
        prefix = '\x1b[31m';
        break;
      case ELogColor.FgGreen:
        prefix = '\x1b[32m';
        break;
      case ELogColor.FgYellow:
        prefix = '\x1b[33m';
        break;
      case ELogColor.FgBlue:
        prefix = '\x1b[34m';
        break;
      case ELogColor.FgMagenta:
        prefix = '\x1b[35m';
        break;
      case ELogColor.FgCyan:
        prefix = '\x1b[36m';
        break;
      default:
        // 'FgWhite'
        prefix = '\x1b[37m';
    }
    const suffix = '\x1b[0m';
    return `${prefix}${text}${suffix}`;
  }

  public coloredLog(color: ELogColor, text: string) {
    console.log(this.coloredText(color, text));
  }

  public async waitSeconds(ms: number) {
    await firstValueFrom(timer(ms).pipe(take(1)));
  }
}
