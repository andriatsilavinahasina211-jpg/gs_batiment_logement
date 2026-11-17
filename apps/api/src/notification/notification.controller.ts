import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Post,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    id: number;
  };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Sse('events')
  @ApiOperation({ summary: 'Flux temps réel des nouvelles notifications' })
  stream(@Request() req: AuthenticatedRequest): Observable<MessageEvent> {
    return this.notificationService.streamForUser(req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Mes notifications (filtrables : non lues seulement)',
  })
  @ApiQuery({ name: 'nonLuesSeulement', required: false, type: Boolean })
  findMes(
    @Request() req: AuthenticatedRequest,
    @Query('nonLuesSeulement') nonLuesSeulement?: string,
  ) {
    return this.notificationService.findMesNotifications(
      req.user.id,
      nonLuesSeulement === 'true',
    );
  }

  @Get('count-non-lues')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  countNonLues(@Request() req: AuthenticatedRequest) {
    return this.notificationService.countNonLues(req.user.id);
  }

  @Patch(':id/lire')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  marquerLue(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.notificationService.marquerCommeLue(id, req.user.id);
  }

  @Patch(':id/non-lire')
  @ApiOperation({ summary: 'Marquer une notification comme non lue' })
  marquerNonLue(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.notificationService.marquerCommeNonLue(id, req.user.id);
  }

  @Patch('lire-toutes')
  @ApiOperation({ summary: 'Marquer toutes mes notifications comme lues' })
  marquerToutesLues(@Request() req: AuthenticatedRequest) {
    return this.notificationService.marquerToutesLues(req.user.id);
  }

  @Post('generer-alertes')
  @ApiOperation({
    summary: 'Scanner les échéances et générer automatiquement les alertes',
  })
  genererAlertes(@Request() req: AuthenticatedRequest) {
    return this.notificationService.genererAlertesAutomatiques(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  supprimer(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.notificationService.supprimerNotification(id, req.user.id);
  }
}
