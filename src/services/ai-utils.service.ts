import { Injectable } from '@nestjs/common';

@Injectable()
export class AiUtilsService {
  /**
   * Extrait tous les blocs JSON encapsulés dans des backticks (```json { ... } ```) d'une chaîne ou d'un tableau d'objets.
   * @param input - Texte ou tableau retourné par un modèle génératif.
   * @returns Tableau d'objets JSON extraits ou null si input invalide.
   */
  public extractCodeBlocks(input: any): any[] | null {
    if (!input) {
      return null;
    }

    let generatedText: string;

    if (typeof input === 'string') {
      generatedText = input;
    } else if (
      Array.isArray(input) &&
      input.length > 0 &&
      typeof input[0]?.generated_text === 'string'
    ) {
      generatedText = input[0].generated_text;
    } else if (typeof input?.generated_text === 'string') {
      generatedText = input.generated_text;
    } else {
      return null;
    }

    // Recherche des blocs JSON encapsulés dans ```json ... ```
    const jsonMatches = generatedText.match(/```[^{`]*({[\s\S]*?})[^}`]*```/gm);

    if (!jsonMatches) {
      return [];
    }

    const parsedData = jsonMatches
      .map((block) => {
        const jsonString = block.replace(/```json\s*|\s*```/g, '').trim();
        try {
          return JSON.parse(jsonString);
        } catch (error) {
          console.error('Erreur lors du parsing du JSON extrait:', error);
          return null;
        }
      })
      .filter((item) => item !== null);

    return parsedData;
  }

  private normalize(word: string): string {
    return word
      .toLowerCase()
      .normalize('NFD') // décompose les accents (é -> e + ́)
      .replace(/[\u0300-\u036f]/g, '') // supprime les accents
      .replace(/[^a-z0-9]/g, '') // ne garde que les lettres
      .trim();
  }

  private wordSimilarity(a: string, b: string): number {
    a = this.normalize(a);
    b = this.normalize(b);

    if (a.length < 1 || b.length < 1) return 0;

    if (a === b) return 1;
    if (a.startsWith(b) || b.startsWith(a)) return 1;

    return 0;
  }

  private matchScore(seq1: string[], seq2: string[]): number {
    let score = 0;
    for (let i = 0; i < seq1.length; i++) {
      score += this.wordSimilarity(seq1[i], seq2[i]);
    }
    return score;
  }

  /**
   * Fusionne deux chaînes de texte en détectant et en supprimant une séquence de mots en commun,
   * même en présence d’un bruit (erreurs ou mots supplémentaires) toléré dans la jonction.
   *
   * La fonction recherche l'overlap (séquence de mots partagée) le plus long et le plus précis
   * entre les deux chaînes, avec une tolérance aux différences. Elle glisse une fenêtre de mots
   * dans les deux chaînes, cherche la correspondance avec le meilleur score, puis fusionne les
   * deux chaînes sans répéter l’overlap.
   *
   * @param s1 - La première chaîne à fusionner. Peut être au début ou à la fin.
   * @param s2 - La deuxième chaîne à fusionner.
   * @param [minWords=2] - Le nombre minimum de mots dans une fenêtre d’overlap à considérer.
   * @param [maxWords=10] - Le nombre maximum de mots dans une fenêtre d’overlap à considérer.
   * @param [tolerance=0] - Le nombre maximal de mots différents autorisés dans la séquence d’overlap.
   *
   * @returns La chaîne fusionnée avec le meilleur overlap détecté (si trouvé dans la tolérance).
   *                   Si aucun overlap n’est trouvé, retourne la concaténation brute de s1 et s2.
   *
   * @example
   * mergeWithTolerance('abc def ghi jkl extra noise', 'noise ghi jkl mno pqr')
   * // → "abc def ghi jkl mno pqr"
   *
   * @example
   * mergeWithTolerance('hello world', 'goodbye moon')
   * // → "hello world goodbye moon" (aucun overlap trouvé)
   */
  public mergeWithTolerance(
    s1: string,
    s2: string,
    minWords = 2,
    maxWords = 10,
    tolerance = 0,
  ): string {
    if (!s1.trim() && !s2.trim()) return '';
    if (!s1.trim()) return s2.trim();
    if (!s2.trim()) return s1.trim();

    const words1 = s1.trim().split(/\s+/);
    const words2 = s2.trim().split(/\s+/);

    let bestScore = -1;
    let bestN = 0;
    let bestI = 0;
    let bestJ = 0;

    for (let n = maxWords; n >= minWords; n--) {
      for (let i = words1.length - n; i >= 0; i--) {
        const window1 = words1.slice(i, i + n);

        for (let j = 0; j <= words2.length - n; j++) {
          const window2 = words2.slice(j, j + n);
          const score = this.matchScore(window1, window2);
          const errors = n - score;

          if (errors <= tolerance) {
            // Favorise les overlaps plus longs, puis les meilleurs scores
            if (score > bestScore || (score === bestScore && n > bestN)) {
              bestScore = score;
              bestN = n;
              bestI = i;
              bestJ = j;
            }
          }
        }
      }
    }

    if (bestScore >= 0) {
      const overlap1 = words1.slice(bestI, bestI + bestN);
      const overlap2 = words2.slice(bestJ, bestJ + bestN);

      let prefix: string[] = [];
      let suffix: string[] = [];
      let overlap: string[];

      if (overlap1.length > overlap2.length) {
        overlap = overlap1;
      } else {
        overlap = overlap2;
      }

      prefix = words1.slice(0, bestI);
      suffix = words2.slice(bestJ + bestN);

      return [...prefix, ...overlap, ...suffix].join(' ');
    }

    // Aucun match assez bon trouvé
    return [...words1, ...words2].join(' ');
  }

  /**
   * Fusionne un tableau de chaînes de caractères en une seule,
   * en utilisant une logique d’overlap tolérant basée sur mergeWithTolerance.
   *
   * L'ordre initial n’est pas supposé fiable : la fusion se fait de manière
   * à détecter automatiquement l’ordre optimal selon le meilleur overlap entre chaque paire.
   *
   * @param inputs - Tableau de chaînes à fusionner.
   * @param [minWords=2] - Nombre minimum de mots dans une fenêtre d’overlap.
   * @param [maxWords=10] - Nombre maximum de mots dans une fenêtre d’overlap.
   * @param [tolerance=0] - Tolérance d’erreurs (mots différents) pour les overlaps.
   *
   * @returns La chaîne fusionnée finale.
   */
  public mergeAllWithTolerance(
    inputs: string[],
    minWords = 2,
    maxWords = 10,
    tolerance = 0,
  ): string {
    if (inputs.length === 0) return '';
    return inputs.reduce((acc, curr) =>
      this.mergeWithTolerance(acc, curr, minWords, maxWords, tolerance),
    );
  }
}
