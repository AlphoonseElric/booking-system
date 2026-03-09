import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma.module';
import { AuthModule } from './modules/auth.module';
import { BookingsModule } from './modules/bookings.module';
import { CalendarWatchModule } from './modules/calendar-watch.module';
import { AiBookingModule } from './modules/ai-booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    BookingsModule,
    CalendarWatchModule,
    AiBookingModule,
  ],
})
export class AppModule {}
