import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import {
  ensureAuthPersistence,
  getCurrentUser,
  hasRequiredRole,
  loginUser,
  logoutUser,
  onAuthStateChanged,
  registerUser,
  sendPasswordReset,
  updateUserProfile,
} from '../external/auth';

export const firebaseAuthRepository: AuthRepository = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  sendPasswordReset,
  getCurrent: getCurrentUser,
  ensurePersistence: ensureAuthPersistence,
  onAuthStateChanged,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};
