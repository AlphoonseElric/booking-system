import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../infrastructure/persistence/prisma/prisma.service';
import { PrismaUserRepository } from '../infrastructure/persistence/prisma/prisma-user.repository';
import { PrismaBookingRepository } from '../infrastructure/persistence/prisma/prisma-booking.repository';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.interface';
import { BOOKING_REPOSITORY } from '../domain/repositories/booking.repository.interface';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository },
  ],
  exports: [PrismaService, USER_REPOSITORY, BOOKING_REPOSITORY],
})
export class PrismaModule {}
