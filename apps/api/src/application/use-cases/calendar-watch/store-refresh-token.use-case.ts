import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';

@Injectable()
export class StoreRefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, refreshToken: string): Promise<void> {
    await this.userRepository.updateRefreshToken(userId, refreshToken);
  }
}
