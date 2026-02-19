import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../infrastructure/http/controllers/auth.controller';
import { JwtStrategy } from '../infrastructure/http/strategies/jwt.strategy';
import { GoogleAuthUseCase } from '../application/use-cases/auth/google-auth.use-case';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [GoogleAuthUseCase, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
