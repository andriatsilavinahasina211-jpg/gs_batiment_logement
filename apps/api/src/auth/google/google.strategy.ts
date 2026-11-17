  import { PassportStrategy } from '@nestjs/passport'
  import { Strategy, VerifyCallback } from 'passport-google-oauth2'
  import { Injectable } from '@nestjs/common'
  import { ConfigService } from '@nestjs/config'
  import { UserService } from 'src/user/user.service'

  @Injectable()
  export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
      private configService: ConfigService,
      private readonly userService: UserService,
    ) {
      const clientID = configService.get<string>('GOOGLE_CLIENT_ID')
      const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET')
      const callbackURL = configService.get<string>('API_SERVICE_URL')
      if (!clientID || !clientSecret || !callbackURL) {
        throw new Error('Google OAuth environment variables are not set')
      }
      super({
        clientID,
        clientSecret,
        callbackURL,
        scope: ['email', 'profile'],
      }) 
    }
    async validate(
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: VerifyCallback,
    ): Promise<any> {
      const { id, name, emails, photos } = profile
      const googleUser = {
        googleId: id,
        email: emails[0].value,
        nom: name.familyName || '',
        prenom: name.givenName || '',
        avatar: photos[0]?.value,
        accessToken,
      }

      // On enregistre ou on récupère l'utilisateur en BDD
      const user = await this.userService.findOrCreateGoogleUser(googleUser);

      done(null, user)
    }
  }