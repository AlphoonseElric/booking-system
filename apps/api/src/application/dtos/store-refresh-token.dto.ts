import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StoreRefreshTokenDto {
  @ApiProperty({ description: 'Google OAuth refresh token for server-side calendar operations' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
