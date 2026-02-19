import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token obtained from Google OAuth flow' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token for API authentication' })
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string | null;
    pictureUrl: string | null;
  };
}
