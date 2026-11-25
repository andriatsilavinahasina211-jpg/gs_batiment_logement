import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PiecesJointesService } from './pieces-jointes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Pièces Jointes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/pieces-jointes')
export class PiecesJointesController {
  constructor(private readonly piecesJointesService: PiecesJointesService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Uploader un fichier — Agent / Chef SRB / Admin' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        typePiece: { type: 'string', description: 'CISJ | PHOTO | DEVIS | CONTRAT | NIF | STAT | ETAT_LIEUX | AUTRE' },
        bienNumero: { type: 'string' },
        demandeRef: { type: 'string' },
        bailNumero: { type: 'string' },
        travauxId: { type: 'string' },
        dateEmission: { type: 'string', format: 'date' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.doc', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(new BadRequestException(`Type de fichier non autorisé: ${ext}`), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    return this.piecesJointesService.create(file, body, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les pièces jointes (filtrables)' })
  @ApiQuery({ name: 'bienNumero', required: false })
  @ApiQuery({ name: 'demandeRef', required: false })
  @ApiQuery({ name: 'bailNumero', required: false })
  @ApiQuery({ name: 'travauxId', required: false })
  @ApiQuery({ name: 'typePiece', required: false })
  findAll(@Query() query: any) {
    return this.piecesJointesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une pièce jointe' })
  findOne(@Param('id') id: string) {
    return this.piecesJointesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une pièce jointe' })
  remove(@Param('id') id: string) {
    return this.piecesJointesService.remove(id);
  }
}
