import { Module } from '@nestjs/common';
import { TravauxService } from './travaux.service';
import { TravauxController } from './travaux.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RecensementModule } from 'src/recensement/recensement.module';

@Module({
  imports: [PrismaModule, RecensementModule],
  controllers: [TravauxController],
  providers: [TravauxService],
  exports: [TravauxService],
})
export class TravauxModule {}
