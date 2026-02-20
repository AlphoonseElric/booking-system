import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RenewWatchesUseCase } from '../../application/use-cases/calendar-watch/renew-watches.use-case';

@Injectable()
export class WatchRenewalCron {
  private readonly logger = new Logger(WatchRenewalCron.name);

  constructor(private readonly renewWatchesUseCase: RenewWatchesUseCase) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleRenewal(): Promise<void> {
    this.logger.log('Running calendar watch renewal check...');
    await this.renewWatchesUseCase.execute();
  }
}
