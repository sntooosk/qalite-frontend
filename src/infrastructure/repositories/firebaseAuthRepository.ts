import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import {
  getCurrentUser,
  hasRequiredRole,
  loginUser,
  logoutUser,
  registerUser,
  sendPasswordReset,
  subscribeToAuthChanges,
  updateUserProfile,
} from '../external/auth';

export const firebaseAuthRepository: AuthRepository = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  sendPasswordReset,
  getCurrent: getCurrentUser,
  subscribeToAuthChanges,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};
