import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({ example: '2025-03-15T10:00:00Z', description: 'Start time in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2025-03-15T11:00:00Z', description: 'End time in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Google OAuth access token for Calendar API' })
  @IsString()
  @IsNotEmpty()
  googleAccessToken: string;

  @ApiProperty({ description: 'Google OAuth refresh token for refreshing access token' })
  @IsString()
  @IsNotEmpty()
  googleRefreshToken: string;
}

export class AvailabilityResultDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty({ type: 'array', description: 'Conflicting bookings in the system' })
  dbConflicts: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
  }[];

  @ApiProperty({ type: 'array', description: 'Conflicting events in Google Calendar' })
  calendarConflicts: {
    id: string;
    title: string;
    start: Date;
    end: Date;
  }[];
}
