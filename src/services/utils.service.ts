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

  public getLastElement(input: string, delimiter: string): string {
    if (!input) return input;
    const parts = input.split(delimiter);
    return parts[parts.length - 1];
  }

  public getAllButLast(input: string, delimiter: string): string {
    if (!input) return input;
    const parts = input.split(delimiter);
    if (parts.length <= 1) return input;
    parts.pop();
    return parts.join(delimiter);
  }

  public roundPercent(valeur1: number, valeur2: number): string {
    if (valeur2 === 0) {
      return 'Division par zéro impossible';
    }
    const pourcentage = (valeur1 / valeur2) * 100;
    const pourcentageArrondi = Math.round(pourcentage);
    return `${pourcentageArrondi}%`;
  }

  public getFileExtension(fileName: string): string {
    if (!fileName) return fileName;
    const regex = new RegExp('[^.]+$');
    const extension = fileName.match(regex);
    return extension ? extension[0] : '';
  }

  public extractPriceAndCurrency(input: string): {
    price: number;
    currency: string;
  } {
    const cleanedInput = input.trim();

    const regex = /([\d.,\s]*)([€$£¥₹₽₩₫₪฿₱A-Z]{1,4})?$/;

    const match = cleanedInput.match(regex);

    if (match) {
      let rawPrice = match[1]?.trim();
      const currency = match[2]?.trim();

      // Si aucun prix ni devise valide n'est détecté
      if (!rawPrice && !currency) {
        return null;
      }

      // Vérification et validation de la devise
      if (currency && !/^[€$£¥₹₽₩₫₪฿₱A-Z]{1,4}$/.test(currency)) {
        return null;
      }

      // Gestion des cas où un prix est absent, mais une devise est présente
      if (!rawPrice || !/[\d]/.test(rawPrice)) {
        return { price: null, currency: currency ?? null };
      }

      // Problem, there is something strange like '12.34€ 56.78€'
      if (!cleanedInput.startsWith(rawPrice)) {
        return null;
      }

      rawPrice = rawPrice.replace(/\s/g, '');

      // Gestion des formats de prix avec points et virgules
      if (rawPrice.includes(',') && rawPrice.includes('.')) {
        // Format mixte : 1,234.56 ou 1.234,56
        if (rawPrice.indexOf(',') < rawPrice.indexOf('.')) {
          // Format anglophone : 1,234.56 -> 1234.56
          rawPrice = rawPrice.replace(/,/g, '');
        } else {
          // Format européen : 1.234,56 -> 1234.56
          rawPrice = rawPrice.replace(/\./g, '').replace(',', '.');
        }
      } else if (rawPrice.includes(',')) {
        // Format européen simple : 1234,56 -> 1234.56
        rawPrice = rawPrice.replace(',', '.');
      }

      // Vérification que le prix est un nombre valide
      if (/^\d*\.?\d+$/.test(rawPrice)) {
        return { price: parseFloat(rawPrice), currency: currency ?? null };
      } else {
        // Si le prix n'est pas valide mais une devise est présente
        return { price: null, currency: currency ?? null };
      }
    }

    return null;
  }
}
