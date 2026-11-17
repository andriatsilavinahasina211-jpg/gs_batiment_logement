import { Module } from '@nestjs/common';
import { IaService } from './ia.service';
import { IaController } from './ia.controller';
import {NotificationService} from "../notification/notification.service";
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IaController],
  providers: [IaService, NotificationService],
  exports: [IaService],
})
export class IaModule {}
