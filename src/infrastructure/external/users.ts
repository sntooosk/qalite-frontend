import { collection, doc, documentId, limit, query, where } from 'firebase/firestore';

import type { UserSummary } from '../../domain/entities/user';
import { firebaseFirestore } from '../database/firebase';
import { getDocCacheFirst, getDocsCacheThenServer } from './firestoreCache';

const USERS_COLLECTION = 'users';
const DEFAULT_DISPLAY_NAME = 'Usuário';
const MAX_SUGGESTION_RESULTS = 15;

export const getUserSummariesByIds = async (userIds: string[]): Promise<UserSummary[]> => {
  if (userIds.length === 0) {
    return [];
  }

  try {
    const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
    const chunks = chunkArray(userIds, 10);
    const snapshots = await Promise.all(
      chunks.map((ids) => getDocsCacheThenServer(query(usersRef, where(documentId(), 'in', ids)))),
    );

    const summaries = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((userDoc) =>
        mapUserSummary(userDoc.id, userDoc.data({ serverTimestamps: 'estimate' }) ?? {}),
      ),
    );
    const summaryMap = summaries.reduce<Record<string, UserSummary>>((acc, summary) => {
      acc[summary.id] = summary;
      return acc;
    }, {});

    return userIds
      .map((userId) => summaryMap[userId])
      .filter((profile): profile is UserSummary => Boolean(profile));
  } catch (error) {
    console.error(error);
    const profiles = await Promise.all(userIds.map((userId) => fetchUserSummary(userId)));
    return profiles.filter((profile): profile is UserSummary => Boolean(profile));
  }
};

export const searchUsersByTerm = async (term: string): Promise<UserSummary[]> => {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return [];
  }

  try {
    const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
    const snapshot = await getDocsCacheThenServer(query(usersRef, limit(100)));

    const matches: UserSummary[] = [];

    snapshot.forEach((userDoc) => {
      const summary = mapUserSummary(
        userDoc.id,
        userDoc.data({ serverTimestamps: 'estimate' }) ?? {},
      );

      const searchableEmail = summary.email.toLowerCase();
      const searchableName = summary.displayName.toLowerCase();

      if (searchableEmail.includes(normalizedTerm) || searchableName.includes(normalizedTerm)) {
        matches.push(summary);
      }
    });

    return matches.slice(0, MAX_SUGGESTION_RESULTS);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const fetchUserSummary = async (userId: string): Promise<UserSummary | null> => {
  if (!userId) {
    return null;
  }

  try {
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    const snapshot = await getDocCacheFirst(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return mapUserSummary(userId, snapshot.data({ serverTimestamps: 'estimate' }) ?? {});
  } catch (error) {
    console.error(error);
    return null;
  }
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

const mapUserSummary = (userId: string, data: Record<string, unknown>): UserSummary => {
  const email = typeof data.email === 'string' ? data.email : '';
  const displayName = resolveDisplayName(data.displayName, email);
  const photoURL = typeof data.photoURL === 'string' ? data.photoURL : null;

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
