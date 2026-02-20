import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../domain/entities/user.entity';
import { Booking } from '../../../domain/entities/booking.entity';
import { CheckAvailabilityUseCase } from '../../../application/use-cases/bookings/check-availability.use-case';
import { CreateBookingUseCase } from '../../../application/use-cases/bookings/create-booking.use-case';
import { GetUserBookingsUseCase } from '../../../application/use-cases/bookings/get-user-bookings.use-case';
import { CancelBookingUseCase } from '../../../application/use-cases/bookings/cancel-booking.use-case';
import {
  CheckAvailabilityDto,
  AvailabilityResultDto,
} from '../../../application/dtos/check-availability.dto';
import { CreateBookingDto } from '../../../application/dtos/create-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getUserBookingsUseCase: GetUserBookingsUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check availability for a time slot',
    description:
      'Checks both the local database and Google Calendar for conflicts in parallel. ' +
      'Returns availability status and details of any conflicts found.',
  })
  @ApiResponse({ status: 200, description: 'Availability result', type: AvailabilityResultDto })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 503, description: 'Google Calendar temporarily unavailable' })
  async checkAvailability(
    @CurrentUser() user: User,
    @Body() dto: CheckAvailabilityDto,
  ): Promise<AvailabilityResultDto> {
    return this.checkAvailabilityUseCase.execute(user.id, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new booking',
    description:
      'Re-validates availability and creates the booking in both the local database and Google Calendar. ' +
      'Returns 409 if any conflicts are found at the moment of creation.',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or date range' })
  @ApiResponse({
    status: 409,
    description: 'Conflict with existing booking or Google Calendar event',
  })
  @ApiResponse({ status: 503, description: 'Google Calendar temporarily unavailable' })
  async createBooking(@CurrentUser() user: User, @Body() dto: CreateBookingDto): Promise<Booking> {
    return this.createBookingUseCase.execute(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of bookings ordered by start time' })
  async getUserBookings(@CurrentUser() user: User): Promise<Booking[]> {
    return this.getUserBookingsUseCase.execute(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Cancels the booking and removes the corresponding Google Calendar event.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiQuery({
    name: 'googleAccessToken',
    required: true,
    description: 'Google OAuth access token to delete the Calendar event',
  })
  @ApiQuery({
    name: 'googleRefreshToken',
    required: true,
    description: 'Google OAuth refresh token to refresh the access token if needed',
  })
  @ApiResponse({ status: 204, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel this booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('googleAccessToken') googleAccessToken: string,
    @Query('googleRefreshToken') googleRefreshToken: string,
  ): Promise<void> {
    return this.cancelBookingUseCase.execute(user.id, id, googleAccessToken, googleRefreshToken);
  }
}
