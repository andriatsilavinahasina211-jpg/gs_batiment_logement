import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google/google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from '../user/user.module'; 
import { UserService } from 'src/user/user.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret-key',
        signOptions: { expiresIn: '1d' },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    UserService,
    RolesGuard, 
  ],
  exports: [AuthService, JwtModule, UserService], // On exporte si d'autres modules ont besoin de JwtService ou AuthService
})
export class AuthModule {}