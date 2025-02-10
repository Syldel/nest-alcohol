import { OnModuleDestroy, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export abstract class BaseService implements OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected destroy$ = new Subject<void>();

  onModuleDestroy() {
    this.logger.warn(
      `🛑 Destruction de ${this.constructor.name}, arrêt des abonnements.`,
    );
    this.destroy$.next();
    this.destroy$.complete();
  }
}
