export class Booking {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly userId: string,
    public readonly googleEventId: string | null,
    public readonly createdAt: Date,
  ) {}

  overlaps(startTime: Date, endTime: Date): boolean {
    return this.startTime < endTime && this.endTime > startTime;
  }

  isOwnedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
