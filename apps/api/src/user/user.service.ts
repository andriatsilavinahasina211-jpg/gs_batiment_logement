import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role, AuthProvider } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

    //utilisateur admin teste
    /**
   * Crée ou réinitialise un utilisateur administrateur de test
   */
  async createTestAdmin() {
    const adminEmail = 'admin.test@srm.mg';
    const rawPassword = 'AdminPassword123!';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Cherche si l'admin existe déjà
    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    let adminUser;

    if (existingAdmin) {
      // S'il existe déjà, mise à jour des accès et du mot de passe
      adminUser = await this.prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          role: Role.ADMINISTRATEUR,
          isActive: true,
          provider: 'EMAIL',
        },
      });
    } else {
      // S'il n'existe pas, création avec matricule unique de test
      adminUser = await this.prisma.user.create({
        data: {
          matricule: 'ADM-2026-TEST',
          email: adminEmail,
          password: hashedPassword,
          nom: 'ADMIN',
          prenom: 'Test',
          role: Role.ADMINISTRATEUR,
          provider: 'EMAIL',
          isActive: true,
        },
      });
    }

    // Exclusion du mot de passe dans le retour HTTP
    const { password: _, ...adminWithoutPassword } = adminUser;

    return {
      message: 'Compte administrateur de test prêt !',
      credentials: {
        email: adminEmail,
        password: rawPassword,
      },
      user: adminWithoutPassword,
    };
  }


  // Recherche un utilisateur par son email
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
    

    /** Validation de connexion avec email + mot de passe */
    async validateUser(email: string, password: string) {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Votre compte est désactivé');
      }

      if (!user.password) {
        throw new UnauthorizedException('Ce compte utilise une connexion Google. Veuillez vous connecter avec Google.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // On ne retourne jamais le mot de passe
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    // Gère la connexion/inscription Google
    async findOrCreateGoogleUser(profile: {
      googleId: string;
      email: string;
      nom: string;
      prenom: string;
      avatar?: string;
    }) {
      // 1. Chercher d'abord par son ID Google
      let user = await this.prisma.user.findUnique({
        where: { googleId: profile.googleId },
      });

      if (user) return user;

      // 2. Si non trouvé par googleId, chercher par email (cas d'un compte créé par EMAIL d'abord)
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // On lie le compte Google à l'utilisateur existant
        return this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            provider: 'GOOGLE',
            avatar: user.avatar || profile.avatar,
          },
        });
      }

      // 3. Si aucun utilisateur n'existe, on le crée en base de données
      return this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          nom: profile.nom,
          prenom: profile.prenom,
          avatar: profile.avatar,
          provider: 'GOOGLE',
          password: null,
          role: Role.AGENT,  // Par défaut, on crée un utilisateur avec le rôle AGENT
          isActive: true,        // Bonne pratique
        },
      });

    }

  //recuperation du mot de passe oublié
  async resetPassword(email: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }

    // ====================== CRUD UTILISATEURS ======================

    async create(dto: any) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new UnauthorizedException('Un utilisateur existe déjà avec cet email');
      }

      let hashedPassword: string | null = null;
      if (dto.password) {
        hashedPassword = await bcrypt.hash(dto.password, 10);
      }

      const user = await this.prisma.user.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          password: hashedPassword,
          matricule: dto.matricule || null,
          role: dto.role || Role.AGENT,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      const { password, ...result } = user;
      return result;
    }

    async findAll() {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return users.map(({ password, ...u }) => u);
    }

    async findOne(id: number) {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });
      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }
      const { password, ...result } = user;
      return result;
    }

    async update(id: number, dto: any) {
      await this.findOne(id);
      const updateData: any = { ...dto };

      if (dto.password) {
        updateData.password = await bcrypt.hash(dto.password, 10);
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      const { password, ...result } = user;
      return result;
    }

    async remove(id: number) {
      await this.findOne(id);
      return this.prisma.user.delete({
        where: { id },
      });
    } 
}