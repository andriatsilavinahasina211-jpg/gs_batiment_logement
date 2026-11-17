import { Module } from '@nestjs/common';
import { BailService } from './bail.service';
import { BailController } from './bail.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BailController],
  providers: [BailService, PrismaService],
  exports: [BailService],
})
export class BailModule {}