import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BiensService } from './bien.service';
import { CreateBienDto } from './dto/create-bien.dto';
import { UpdateBienDto } from './dto/update-bien.dto';
import { BienQueryDto } from './dto/bien-query.dto';
import type { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

// Dossier d'upload (absolu)
const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Créer le dossier s'il n'existe pas
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('dashboard/biens')
export class BiensController {
  constructor(private readonly biensService: BiensService) {}

  // ==================== UPLOAD PHOTO ====================
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `bien-${unique}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 Mo
      },
      fileFilter: (_req, file, cb) => {
        // Ne pas utiliser BadRequestException ici (Multer attend une Error)
        if (!file.mimetype?.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          return cb(
            new Error('Seules les images JPG, PNG et WEBP sont autorisées'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'Aucun fichier reçu. Vérifiez que le champ s\'appelle "file".',
      );
    }

    const url = `http://localhost:8000/uploads/${file.filename}`;

    return {
      success: true,
      url,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  // ==================== CRÉATION ====================
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  create(@Body() createBienDto: CreateBienDto, @Req() req: Request) {
    return this.biensService.create(createBienDto, req.user);
  }

  // ==================== LISTE ====================
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  findAll(@Query() query: BienQueryDto) {
    return this.biensService.findAll(query);
  }

  // ==================== IMPORT EXCEL ====================
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier Excel requis');
    }

    const userId =
      (req.user as any)?.id ??
      (req.user as any)?.userId ??
      (req.user as any)?.sub;

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.biensService.importExcel(file, Number(userId));
  }

    // ==================== CARTE DES BIENS ====================
  @Get('map/points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  findForMap() {
    return this.biensService.findForMap();
  }

  // ==================== DÉTAIL ====================
  @Get(':numeroBien')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  findOne(@Param('numeroBien') numeroBien: string) {
    return this.biensService.findOne(numeroBien);
  }

  // ==================== MISE À JOUR ====================
  @Patch(':numeroBien')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  update(
    @Param('numeroBien') numeroBien: string,
    @Body() updateBienDto: UpdateBienDto,
    @Req() req: Request,
  ) {
    const userId =
      (req.user as any)?.id ??
      (req.user as any)?.userId ??
      (req.user as any)?.sub;

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.biensService.update(
      numeroBien,
      updateBienDto,
      Number(userId),
    );
  }

  // ==================== SUPPRESSION ====================
  @Delete(':numeroBien')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR', 'AGENT', 'CHEF_SRB')
  remove(@Param('numeroBien') numeroBien: string, @Req() req: Request) {
    const userId =
      (req.user as any)?.id ??
      (req.user as any)?.userId ??
      (req.user as any)?.sub;

    if (!userId) {
      throw new BadRequestException('Utilisateur non authentifié');
    }

    return this.biensService.remove(numeroBien, Number(userId));
  }
}