import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OccupationService } from './occupation.service';
import { OccupationController } from './occupation.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationModule],
  controllers: [OccupationController],
  providers: [OccupationService, PrismaService],
  exports: [OccupationService],
})
export class OccupationModule {}