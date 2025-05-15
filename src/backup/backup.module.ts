import { Module } from '@nestjs/common';

import { AlcoholModule } from '../alcohol/alcohol.module';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';

@Module({
  controllers: [BackupController],
  imports: [AlcoholModule],
  providers: [BackupService],
})
export class BackupModule {}
