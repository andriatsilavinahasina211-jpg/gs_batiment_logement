import { Body, Controller, Get, HttpCode, HttpStatus, Post, Redirect, Req, Res, UseGuards } from '@nestjs/common'
import { GoogleAuthGuard } from './google/google.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() { }

  @Redirect()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req) {
    const authResponse = this.authService.generateAuthResponse(req.user);

    return {
      url: `http://localhost:3000/auth/callback?token=${authResponse.access_token}&role=${authResponse.user.role}`,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() LoginDto: LoginDto) {
    return this.authService.login(LoginDto)
  }
}