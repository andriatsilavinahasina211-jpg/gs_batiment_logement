import { Module } from '@nestjs/common';
import { OccupantService } from './occupant.service';
import { OccupantController } from './occupant.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OccupantController],
  providers: [OccupantService],
  exports: [OccupantService],
})
export class OccupantModule {}
