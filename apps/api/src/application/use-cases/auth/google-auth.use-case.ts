import { Injectable, Inject, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { AuthResponseDto } from '../../dtos/google-auth.dto';

@Injectable()
export class GoogleAuthUseCase {
  private readonly logger = new Logger(GoogleAuthUseCase.name);
  private readonly oauth2Client: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.oauth2Client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
  }

  async execute(idToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyGoogleToken(idToken);

    const user = await this.userRepository.upsert({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? undefined,
      pictureUrl: payload.picture ?? undefined,
    });

    const jwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pictureUrl: user.pictureUrl,
      },
    };
  }

  private async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload?.sub || !payload?.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      return payload as { sub: string; email: string; name?: string; picture?: string };
    } catch (error) {
      this.logger.error('Google token verification failed', error);
      throw new UnauthorizedException('Invalid or expired Google token');
    }
  }
}
