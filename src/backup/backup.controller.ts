import { Controller, Post } from '@nestjs/common';

import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  async triggerBackup() {
    return await this.backupService.handleBackup();
  }
}
