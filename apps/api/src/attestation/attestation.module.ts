import { Module } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { AttestationController } from './attestation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttestationController],
  providers: [AttestationService],
  exports: [AttestationService],
})
export class AttestationModule {}
