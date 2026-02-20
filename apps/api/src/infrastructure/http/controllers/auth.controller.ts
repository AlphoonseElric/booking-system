import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleAuthUseCase } from '../../../application/use-cases/auth/google-auth.use-case';
import { GoogleAuthDto, AuthResponseDto } from '../../../application/dtos/google-auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly googleAuthUseCase: GoogleAuthUseCase) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with Google',
    description:
      'Validates a Google ID token and returns a JWT for subsequent API calls. ' +
      'The frontend should obtain the ID token via Google OAuth and pass it here.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired Google token' })
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<AuthResponseDto> {
    return this.googleAuthUseCase.execute(dto.idToken);
  }
}
