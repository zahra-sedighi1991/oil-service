import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from './auth.decorators';
import { AuthService } from './auth.service';
import {
  PasswordLoginDto,
  PasswordRegisterDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('password/register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerWithPassword(@Body() dto: PasswordRegisterDto) {
    return this.auth.registerWithPassword(dto);
  }

  @Post('password/login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  loginWithPassword(@Body() dto: PasswordLoginDto) {
    return this.auth.loginWithPassword(dto);
  }

  @Post('otp/request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  request(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.mobile);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }
}
