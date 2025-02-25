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

  /**
   * Nettoie une chaîne HTML en supprimant :
   * - Les balises <script> et leur contenu,
   * - Les commentaires HTML,
   * - Les balises <a> et leur contenu,
   * - Les class="***",
   * - Les style="***",
   * - Les espaces en trop.
   * @param htmlString - La chaîne HTML à nettoyer.
   * @returns La chaîne HTML nettoyée.
   */
  public cleanHtml(htmlString: string): string {
    // Supprime les balises <script> et leur contenu
    let cleanedHtml = htmlString.replace(/<script.*?>.*?<\/script>/gs, '');
    // Supprime les commentaires HTML
    cleanedHtml = cleanedHtml.replace(/<!--.*?-->/gs, '');

    // Supprime les balises <a> avec leurs attributs et contenu
    cleanedHtml = cleanedHtml.replace(/<a.*?>.*?<\/a>/gs, '');

    // Supprime les éléments contenant style="display:none"
    // cleanedHtml = cleanedHtml.replace(
    //   /<div[^>]*style=["']?display\s*:\s*none.*?>.*?<\/div>/gis,
    //   '',
    // );

    cleanedHtml = cleanedHtml.replace(/\s*class="[^"]*"/g, '');
    cleanedHtml = cleanedHtml.replace(/\s*style="[^"]*"/g, '');

    // Supprime les attributs data-*
    cleanedHtml = cleanedHtml.replace(/\s*data-[^=]+="[^"]*"/g, '');

    // Supprime les espaces en trop (incluant les lignes vides)
    cleanedHtml = cleanedHtml.replace(/\s+/g, ' '); // Remplace plusieurs espaces consécutifs par un seul espace
    cleanedHtml = cleanedHtml.trim();
    return cleanedHtml;
  }

  public extractNumbers(input: string): number[] {
    const matches = input.match(/-?\d+([\s.,]\d+)*([.,]\d+)?/g);

    if (!matches) {
      return [];
    }

    return matches.map((match) =>
      parseFloat(this.cleanNumberFormat(match.replace(/\s/g, ''))),
    );
  }

  public cleanNumberFormat(input: string): string {
    if (!input) {
      return '';
    }

    // Use a regex to clean the input
    // 1. Remove commas used as thousand separators
    // 2. Replace a comma as a decimal separator with a dot
    // 3. Remove any extra dots except the one used as the decimal separator
    const cleanedInput = input
      .replace(/,/g, '.') // Replace all commas with dots
      .replace(/\.(?=.*\.)/g, '') // Remove all dots except the last one
      .replace(/\.([^.]*\.)/g, '.$1'); // Ensure only one dot is kept as the decimal separator

    return cleanedInput;
  }

  // Fonction générique pour supprimer les doublons d'un tableau d'objets
  public removeDuplicates<T>(
    array: T[],
    keySelector: (item: T) => string,
  ): T[] {
    return array.filter(
      (value, index, self) =>
        index === self.findIndex((t) => keySelector(t) === keySelector(value)),
    );
  }
}
