import { UserRole } from '../common/enums';

export interface AuthUser {
  sub: string;
  shopId?: string;
  role: UserRole;
  mobile: string;
}
