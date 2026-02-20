import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../domain/entities/user.entity';
import { CalendarWatch } from '../../../domain/entities/calendar-watch.entity';
import { CreateWatchUseCase } from '../../../application/use-cases/calendar-watch/create-watch.use-case';
import { StoreRefreshTokenUseCase } from '../../../application/use-cases/calendar-watch/store-refresh-token.use-case';
import { StoreRefreshTokenDto } from '../../../application/dtos/store-refresh-token.dto';

@ApiTags('Calendar Watch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar/watch')
export class CalendarWatchController {
  constructor(
    private readonly createWatchUseCase: CreateWatchUseCase,
    private readonly storeRefreshTokenUseCase: StoreRefreshTokenUseCase,
  ) {}

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Store Google refresh token',
    description:
      'Stores the Google OAuth refresh token server-side so the backend can call the Calendar API when webhooks arrive (no user session required).',
  })
  @ApiResponse({ status: 200, description: 'Refresh token stored successfully' })
  async storeRefreshToken(
    @CurrentUser() user: User,
    @Body() dto: StoreRefreshTokenDto,
  ): Promise<void> {
    await this.storeRefreshTokenUseCase.execute(user.id, dto.refreshToken);
  }

  @Post()
  @ApiOperation({
    summary: 'Start watching Google Calendar for changes',
    description:
      'Registers a Google Calendar push notification channel for the authenticated user. Requires the refresh token to have been stored first via POST /calendar/watch/refresh-token.',
  })
  @ApiResponse({ status: 201, description: 'Watch created successfully' })
  @ApiResponse({ status: 400, description: 'Refresh token not stored' })
  async createWatch(@CurrentUser() user: User): Promise<CalendarWatch> {
    return this.createWatchUseCase.execute(user.id);
  }
}
