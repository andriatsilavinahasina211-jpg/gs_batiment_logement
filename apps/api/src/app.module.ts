import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { BiensModule } from './bien/bien.module';
import { OccupationModule } from './occupation/occupation.module';
import { BailModule } from './bail/bail.module';
import { OccupantModule } from './occupant/occupant.module';
import { DemandeModule } from './demande/demande.module';
import { AttestationModule } from './attestation/attestation.module';
// ── Nouveaux modules (manquants dans CDC) ──────────────────────────────────
import { RecensementModule } from './recensement/recensement.module';
import { TravauxModule } from './travaux/travaux.module';
import { NotificationModule } from './notification/notification.module';
import { PiecesJointesModule } from './pieces-jointes/pieces-jointes.module';
import { AuditModule } from './audit/audit.module';
import { DocumentsModule } from './documents/documents.module';
import { IaModule } from './ia/ia.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ── Modules existants ──────────────────────────────────────────────────
    AuthModule,
    UserModule,
    PrismaModule,
    DashboardModule,
    BiensModule,
    OccupationModule,
    BailModule,
    OccupantModule,
    DemandeModule,
    AttestationModule,
    // ── Nouveaux modules (CDC v1.2) ────────────────────────────────────────
    RecensementModule,
    TravauxModule,
    NotificationModule,
    PiecesJointesModule,
    AuditModule,
    DocumentsModule,
    IaModule,
  ],
  controllers: [AppController, DashboardController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
