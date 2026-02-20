export class CalendarWatch {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly channelId: string,
    public readonly resourceId: string,
    public readonly channelToken: string,
    public readonly expiration: Date,
    public readonly createdAt: Date,
  ) {}

  isExpired(): boolean {
    return this.expiration < new Date();
  }

  isExpiringSoon(withinMs: number): boolean {
    return this.expiration.getTime() - Date.now() < withinMs;
  }
}
