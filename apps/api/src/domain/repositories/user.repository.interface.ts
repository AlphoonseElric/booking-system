import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UpsertUserData {
  googleId: string;
  email: string;
  name?: string;
  pictureUrl?: string;
}

export interface IUserRepository {
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  upsert(data: UpsertUserData): Promise<User>;
}
