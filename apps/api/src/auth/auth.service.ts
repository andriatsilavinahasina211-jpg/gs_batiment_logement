import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    const user = await this.userService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure required fields are present
    if (!user.id || !user.email) {
      throw new UnauthorizedException('User data is incomplete');
    }

    return this.generateAuthResponse(user); // ← on réutilise la même logique
  }

  /**
   * Méthode utilisée pour Google (et autres OAuth)
   * Prend un utilisateur déjà validé et génère le token + réponse
   */
  generateAuthResponse(user: any) {
    if (!user.id || !user.email) {
      throw new UnauthorizedException('User data is incomplete');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}