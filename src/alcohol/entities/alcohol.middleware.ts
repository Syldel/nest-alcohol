import * as fs from 'fs-extra';

export async function backupDocument(doc) {
  try {
    const targetKeyword = doc.type;
    const langCountryCode = doc.langCode;
    const backupFilePath = `./jsons/${targetKeyword}-${langCountryCode}-mongo-backup.json`;
    const collectionName = this.collection.name;

    // Charger ou initialiser le fichier de backup
    const backupData = (await fs.pathExists(backupFilePath))
      ? await fs.readJson(backupFilePath)
      : {};

    // Ajouter le nouveau document sauvegardé
    backupData[collectionName] = backupData[collectionName] || [];

    const existing = backupData[collectionName].find(
      (d) => d.asin === doc.asin,
    );
    if (!existing) {
      backupData[collectionName].push(doc);
    } else {
      // console.log(`Data already exists in ${backupFilePath}`);
      return;
    }

    console.log(
      backupData[collectionName].length,
      `${targetKeyword}(s) in Database`,
    );

    // Sauvegarder les données mises à jour
    await fs.writeJson(backupFilePath, backupData, { spaces: 2 });
    console.log(
      '\x1b[32m' +
        `Backup mis à jour après l'insertion dans ${collectionName}` +
        '\x1b[0m',
    );
  } catch (error) {
    console.error(
      '\x1b[31m' + 'Erreur lors du backup live:' + '\x1b[0m',
      error,
    );
  }
}
