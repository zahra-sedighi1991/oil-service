import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Shop, User } from '../database/entities';
import { normalizeMobile } from '../common/normalizers';
import { RecordStatus, ShopStatus, UserRole } from '../common/enums';
import { PasswordLoginDto, PasswordRegisterDto, VerifyOtpDto } from './dto';

const scryptAsync = promisify(scrypt);

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
    if (!mobile) return;
    const adminPassword = process.env.ADMIN_PASSWORD;
    let admin = await this.users.findOneBy({ mobile });
    if (!admin) {
      admin = this.users.create({
        mobile,
        name: process.env.ADMIN_NAME ?? 'System Admin',
        role: UserRole.SUPER_ADMIN,
        status: RecordStatus.ACTIVE,
      });
    }
    if (adminPassword && !admin.passwordHash) {
      admin.passwordHash = await this.hashPassword(adminPassword);
    }
    await this.users.save(admin);
  }

  async registerWithPassword(dto: PasswordRegisterDto) {
    const mobile = this.validateMobile(dto.mobile);
    const existingUser = await this.users.findOneBy({ mobile });
    if (existingUser) {
      const canUpgradeLegacyAccount =
        process.env.NODE_ENV !== 'production'
        && existingUser.role === UserRole.SHOP_OWNER
        && Boolean(existingUser.shopId)
        && !existingUser.passwordHash;
      if (canUpgradeLegacyAccount) {
        const upgradedUser = await this.dataSource.transaction(async (manager) => {
          existingUser.name = dto.name;
          existingUser.passwordHash = await this.hashPassword(dto.password);
          existingUser.status = RecordStatus.ACTIVE;
          if (existingUser.shopId) {
            const shop = await manager.findOneBy(Shop, { id: existingUser.shopId });
            if (shop) {
              shop.name = dto.shopName;
              shop.ownerName = dto.name;
              shop.publicPhone = mobile;
              shop.city = dto.city;
              shop.status = ShopStatus.ACTIVE;
              await manager.save(shop);
            }
          }
          return manager.save(User, existingUser);
        });
        return this.issueToken(upgradedUser);
      }
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده است؛ وارد حساب خود شوید.');
    }
    const user = await this.dataSource.transaction(async (manager) => {
      const shop = await manager.save(Shop, manager.create(Shop, {
        name: dto.shopName,
        ownerName: dto.name,
        publicPhone: mobile,
        city: dto.city,
        status: ShopStatus.ACTIVE,
      }));
      return manager.save(User, manager.create(User, {
        mobile,
        passwordHash: await this.hashPassword(dto.password),
        name: dto.name,
        shopId: shop.id,
        role: UserRole.SHOP_OWNER,
        status: RecordStatus.ACTIVE,
      }));
    });
    return this.issueToken(user);
  }

  async loginWithPassword(dto: PasswordLoginDto) {
    const mobile = this.validateMobile(dto.mobile);
    const user = await this.users.findOneBy({ mobile });
    if (
      !user
      || user.status !== RecordStatus.ACTIVE
      || !user.passwordHash
      || !await this.verifyPassword(dto.password, user.passwordHash)
    ) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور صحیح نیست.');
    }
    await this.assertAccountAccess(user);
    return this.issueToken(user);
  }

  requestOtp(rawMobile: string) {
    this.ensureOtpEnabled();
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
    this.ensureOtpEnabled();
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
    await this.assertAccountAccess(user);
    this.otpStore.delete(mobile);

    return this.issueToken(user);
  }

  private async issueToken(user: User) {
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

  private validateMobile(rawMobile: string) {
    const mobile = normalizeMobile(rawMobile);
    if (!/^09\d{9}$/.test(mobile)) {
      throw new BadRequestException('شماره موبایل را به‌صورت ۱۱ رقمی وارد کنید.');
    }
    return mobile;
  }

  private async assertAccountAccess(user: User) {
    if (user.status !== RecordStatus.ACTIVE) {
      throw new UnauthorizedException('دسترسی این حساب کاربری غیرفعال شده است.');
    }
    if (user.role === UserRole.SUPER_ADMIN) return;
    const shop = user.shopId ? await this.dataSource.getRepository(Shop).findOneBy({ id: user.shopId }) : null;
    if (!shop) throw new UnauthorizedException('فروشگاه این حساب کاربری یافت نشد.');
    if (shop.status === ShopStatus.PENDING) {
      throw new UnauthorizedException('فروشگاه هنوز توسط مدیر سامانه تأیید نشده است.');
    }
    if (shop.status !== ShopStatus.ACTIVE) {
      throw new UnauthorizedException('دسترسی فروشگاه غیرفعال یا تعلیق شده است.');
    }
  }

  private ensureOtpEnabled() {
    if (process.env.OTP_ENABLED !== 'true') {
      throw new BadRequestException('ورود با رمز یک‌بارمصرف موقتاً غیرفعال است.');
    }
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16);
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string) {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
