import type { Role } from './Role';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}
