import * as fs from 'fs-extra';

export async function backupDocument(doc) {
  try {
    const backupFilePath = './jsons/mongo-live-backup.json';
    const collectionName = this.collection.name;

    // Charger ou initialiser le fichier de backup
    const backupData = (await fs.pathExists(backupFilePath))
      ? await fs.readJson(backupFilePath)
      : {};

    // Ajouter le nouveau document sauvegardé
    backupData[collectionName] = backupData[collectionName] || [];
    backupData[collectionName].push(doc);

    // Sauvegarder les données mises à jour
    await fs.writeJson(backupFilePath, backupData, { spaces: 2 });
    console.log(`Backup mis à jour après l'insertion dans ${collectionName}`);
  } catch (error) {
    console.error('Erreur lors du backup live:', error);
  }
}
