import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Shop, User } from '../database/entities';
import { normalizeMobile } from '../common/normalizers';
import { RecordStatus, ShopStatus, UserRole } from '../common/enums';
import { VerifyOtpDto } from './dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly otpStore = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    const mobile = process.env.ADMIN_MOBILE
      ? normalizeMobile(process.env.ADMIN_MOBILE)
      : undefined;
    if (!mobile || await this.users.existsBy({ mobile })) return;
    await this.users.save(this.users.create({
      mobile,
      name: process.env.ADMIN_NAME ?? 'System Admin',
      role: UserRole.SUPER_ADMIN,
      status: RecordStatus.ACTIVE,
    }));
  }

  requestOtp(rawMobile: string) {
    const mobile = normalizeMobile(rawMobile);
    if (!/^09\d{9}$/.test(mobile)) {
      throw new BadRequestException('شماره موبایل را به‌صورت ۱۱ رقمی وارد کنید.');
    }
    const code = process.env.NODE_ENV === 'production'
      ? String(randomInt(100000, 1_000_000))
      : '123456';
    this.otpStore.set(mobile, { code, expiresAt: Date.now() + 120_000 });
    return {
      expiresIn: 120,
      ...(process.env.NODE_ENV === 'production' ? {} : { developmentCode: code }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const mobile = normalizeMobile(dto.mobile);
    const challenge = this.otpStore.get(mobile);
    if (!challenge || challenge.expiresAt < Date.now() || challenge.code !== dto.code) {
      throw new BadRequestException('رمز یک‌بارمصرف نامعتبر یا منقضی است.');
    }
    let user = await this.users.findOneBy({ mobile });
    if (!user) {
      if (!dto.name || !dto.shopName || !dto.city) {
        return { registrationRequired: true, mobile };
      }
      user = await this.dataSource.transaction(async (manager) => {
        const shop = await manager.save(Shop, manager.create(Shop, {
          name: dto.shopName,
          ownerName: dto.name,
          publicPhone: mobile,
          city: dto.city,
          status: ShopStatus.ACTIVE,
        }));
        return manager.save(User, manager.create(User, {
          mobile,
          name: dto.name,
          shopId: shop.id,
          role: UserRole.SHOP_OWNER,
          status: RecordStatus.ACTIVE,
        }));
      });
    }
    this.otpStore.delete(mobile);

    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        shopId: user.shopId,
        role: user.role,
        mobile: user.mobile,
      }),
      user: { id: user.id, name: user.name, shopId: user.shopId, role: user.role },
    };
  }
}
