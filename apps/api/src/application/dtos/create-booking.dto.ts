import { IsDateString, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'Team Standup', description: 'Name or title of the booking' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '2025-03-15T10:00:00Z', description: 'Start time in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2025-03-15T11:00:00Z', description: 'End time in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Google OAuth access token for Calendar API integration' })
  @IsString()
  @IsNotEmpty()
  googleAccessToken: string;

  @ApiProperty({ description: 'Google OAuth refresh token for refreshing access token' })
  @IsString()
  @IsNotEmpty()
  googleRefreshToken: string;
}
