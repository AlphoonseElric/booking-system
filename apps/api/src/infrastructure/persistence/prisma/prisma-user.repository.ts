import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUserRepository, UpsertUserData } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGoogleId(googleId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { googleId } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async upsert(data: UpsertUserData): Promise<User> {
    const record = await this.prisma.user.upsert({
      where: { googleId: data.googleId },
      update: {
        email: data.email,
        name: data.name ?? null,
        pictureUrl: data.pictureUrl ?? null,
      },
      create: {
        googleId: data.googleId,
        email: data.email,
        name: data.name ?? null,
        pictureUrl: data.pictureUrl ?? null,
      },
    });
    return this.toDomain(record);
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { googleRefreshToken: refreshToken },
    });
  }

  private toDomain(record: {
    id: string;
    email: string;
    googleId: string;
    name: string | null;
    pictureUrl: string | null;
    createdAt: Date;
    googleRefreshToken: string | null;
  }): User {
    return new User(
      record.id,
      record.email,
      record.googleId,
      record.name,
      record.pictureUrl,
      record.createdAt,
      record.googleRefreshToken,
    );
  }
}
