import { BadRequestException, Module } from '@nestjs/common';
import { BiensService } from './bien.service';
import { BiensController } from './bien.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/excel',
        filename: (req, file, cb) => {
          cb(null, `inventaire-${Date.now()}.xlsx`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new BadRequestException('Seuls les fichiers Excel sont autorisés'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [BiensController],
  providers: [BiensService],
  exports: [BiensService],
})
export class BiensModule {}