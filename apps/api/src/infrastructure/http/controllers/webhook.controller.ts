import { Controller, Post, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { HandleWebhookUseCase } from '../../../application/use-cases/calendar-watch/handle-webhook.use-case';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly handleWebhookUseCase: HandleWebhookUseCase) {}

  @Post('google-calendar')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleGoogleCalendarWebhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-channel-token') channelToken: string,
    @Headers('x-goog-resource-state') resourceState: string,
  ): Promise<void> {
    this.logger.log(`Webhook received: channel=${channelId}, state=${resourceState}`);

    try {
      await this.handleWebhookUseCase.execute(channelId, channelToken, resourceState);
    } catch (err) {
      // Always return 200 to Google to avoid retry storms
      this.logger.error(`Unhandled error in webhook handler: ${err.message}`);
    }
  }
}
