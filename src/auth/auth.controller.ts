import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from './auth.decorators';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto';

@ApiTags('auth')
@Public()
@Controller('auth/otp')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  request(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.mobile);
  }

  @Post('verify')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }
}
