import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OccupantService } from './occupant.service';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';

@ApiTags('Occupants (Fonctionnaires)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/occupants')
export class OccupantController {
  constructor(private readonly occupantService: OccupantService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel occupant / fonctionnaire' })
  create(@Body() dto: CreateOccupantDto) {
    return this.occupantService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les occupants avec filtres' })
  findAll(@Query() query: { search?: string; ministere?: string }) {
    return this.occupantService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un occupant' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.occupantService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour les informations d\'un occupant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOccupantDto,
  ) {
    return this.occupantService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un occupant' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.occupantService.remove(id);
  }
}
