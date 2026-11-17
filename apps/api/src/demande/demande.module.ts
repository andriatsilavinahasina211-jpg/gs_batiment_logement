import { Module } from '@nestjs/common';
import { DemandeService } from './demande.service';
import { DemandeController } from './demande.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RecensementModule } from 'src/recensement/recensement.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [PrismaModule, RecensementModule, NotificationModule],
  controllers: [DemandeController],
  providers: [DemandeService],
  exports: [DemandeService],
})
export class DemandeModule {}
