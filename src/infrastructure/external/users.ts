import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import type { UserSummary } from '../../domain/entities/user';
import { firebaseFirestore } from '../database/firebase';

const USERS_COLLECTION = 'users';
const DEFAULT_DISPLAY_NAME = 'Usuário';

export const listAllUserSummaries = async (): Promise<UserSummary[]> => {
  const usersCollection = collection(firebaseFirestore, USERS_COLLECTION);
  const snapshot = await getDocs(usersCollection);

  return snapshot.docs
    .map((userDoc) => mapUserSummary(userDoc.id, userDoc.data()))
    .filter((profile): profile is UserSummary => Boolean(profile))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

export const getUserSummariesByIds = async (userIds: string[]): Promise<UserSummary[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const profiles = await Promise.all(userIds.map((userId) => fetchUserSummary(userId)));
  return profiles.filter((profile): profile is UserSummary => Boolean(profile));
};

const fetchUserSummary = async (userId: string): Promise<UserSummary | null> => {
  if (!userId) {
    return null;
  }

  const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
  const snapshot = await getDoc(userRef);

  return mapUserSummary(userId, snapshot.data());
};

const mapUserSummary = (userId: string, data: unknown): UserSummary | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const rawData = data as Record<string, unknown>;
  const email = typeof rawData.email === 'string' ? rawData.email : '';
  const displayName = resolveDisplayName(rawData.displayName, email);
  const photoURL = typeof rawData.photoURL === 'string' ? rawData.photoURL : null;

  return {
    id: userId,
    email,
    displayName,
    photoURL,
  };
};

const resolveDisplayName = (rawDisplayName: unknown, email: string): string => {
  const normalizedName = typeof rawDisplayName === 'string' ? rawDisplayName.trim() : '';

  if (normalizedName) {
    return normalizedName;
  }

  if (email) {
    return email;
  }

  return DEFAULT_DISPLAY_NAME;
};
