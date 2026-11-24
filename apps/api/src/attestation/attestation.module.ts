import { Module, forwardRef } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { AttestationController } from './attestation.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DemandeModule } from 'src/demande/demande.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DemandeModule)],
  controllers: [AttestationController],
  providers: [AttestationService],
  exports: [AttestationService],
})
export class AttestationModule {}
