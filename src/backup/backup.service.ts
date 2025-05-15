import * as fs from 'fs-extra';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Alcohol, AlcoholDocument } from '../alcohol/entities/alcohol.entity';

@Injectable()
export class BackupService {
  constructor(
    @InjectModel(Alcohol.name)
    private readonly alcoholModel: Model<AlcoholDocument>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleScheduledBackup() {
    console.log('⚙️ Scheduled backup started');
    await this.handleBackup();
  }

  async handleBackup(): Promise<{
    status: string;
    message: string;
    count?: number;
  }> {
    try {
      const data = await this.alcoholModel.find().lean();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const backupDir = path.join(__dirname, '../../../backups');
      const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

      // Assure que le dossier existe
      await fs.ensureDir(backupDir);

      await fs.writeJson(backupPath, { alcohols: data }, { spaces: 2 });

      console.log(`⚡ [Backup] Fichier sauvegardé à ${backupPath}`);

      const count = await this.readBackupAndCount(backupPath, 'alcohols');

      return {
        status: 'success',
        message: 'Backup completed and verified',
        count,
      };
    } catch (error) {
      console.error(`⚡ [Backup] Backup failed: ${error.message}`);
      return {
        status: 'error',
        message: 'Backup failed',
      };
    }
  }

  async readBackupAndCount(
    filePath: string,
    collectionName: string,
  ): Promise<number> {
    try {
      const data = await fs.readJson(filePath);
      const collection = Array.isArray(data) ? data : data[collectionName];
      const count = Array.isArray(collection) ? collection.length : 0;

      console.log(`⚡ [Backup] ${count} ${collectionName}(s) found in backup`);
      return count;
    } catch (error) {
      console.error(
        `⚡ [Backup] Failed to read or parse backup: ${error.message}`,
      );
      return 0;
    }
  }
}
