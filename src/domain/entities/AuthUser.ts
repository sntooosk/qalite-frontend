import type { Role } from './Role';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  accessToken?: string;
  photoURL?: string;
}
