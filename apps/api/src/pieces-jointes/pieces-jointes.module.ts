import { Module } from '@nestjs/common';
import { PiecesJointesService } from './pieces-jointes.service';
import { PiecesJointesController } from './pieces-jointes.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [PiecesJointesController],
  providers: [PiecesJointesService],
  exports: [PiecesJointesService],
})
export class PiecesJointesModule {}
