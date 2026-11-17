// apps/api/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: any) {
    // On va chercher l'utilisateur complet en BDD (sans le password pour la sécurité)
    const user = await this.userService.findByEmail(payload.email);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Compte inactif ou introuvable");
    }

    // Ce qui est renvoyé ici se retrouvera dans req.user
    return user;
  }
}