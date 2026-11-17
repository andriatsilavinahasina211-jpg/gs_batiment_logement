import { Module } from '@nestjs/common';
import { RecensementService } from './recensement.service';
import { RecensementController } from './recensement.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecensementController],
  providers: [RecensementService],
  exports: [RecensementService], // Exporté pour usage dans TravauxModule
})
export class RecensementModule {}
