export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly googleId: string,
    public readonly name: string | null,
    public readonly pictureUrl: string | null,
    public readonly createdAt: Date,
  ) {}
}
