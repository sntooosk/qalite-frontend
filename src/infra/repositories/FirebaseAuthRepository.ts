import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { AuthUser } from '../../domain/entities/AuthUser';
import { DEFAULT_ROLE, Role } from '../../domain/entities/Role';
import {
  AuthStateListener,
  IAuthRepository,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload
} from '../../domain/repositories/AuthRepository';
import { firebaseAuth, firebaseFirestore, firebaseStorage } from '../firebase/firebaseConfig';

const USERS_COLLECTION = 'users';
const USER_AVATAR_FILE = 'avatar.jpg';

export class FirebaseAuthRepository implements IAuthRepository {
  async register(payload: RegisterPayload): Promise<AuthUser> {
    const { user } = await createUserWithEmailAndPassword(
      firebaseAuth,
      payload.email,
      payload.password
    );

    await firebaseUpdateProfile(user, { displayName: payload.displayName });

    const role = payload.role;
    await this.persistUserProfile(user, {
      role,
      displayName: payload.displayName,
      photoURL: user.photoURL ?? null,
      isNew: true
    });

    const profile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(user, profile);
  }

  async login(payload: LoginPayload): Promise<AuthUser> {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      payload.email,
      payload.password
    );

    const profile = await this.fetchUserProfile(credential.user.uid);
    return this.mapToAuthUser(credential.user, profile);
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      return null;
    }

    const profile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(user, profile);
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    return firebaseOnAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        listener(null);
        return;
      }

      const profile = await this.fetchUserProfile(user.uid);
      listener(this.mapToAuthUser(user, profile));
    });
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    const currentProfile = await this.fetchUserProfile(user.uid);

    let photoURL = currentProfile.photoURL ?? user.photoURL ?? null;
    if (payload.photoFile) {
      photoURL = await this.uploadProfilePhoto(user.uid, payload.photoFile);
    }

    await firebaseUpdateProfile(user, {
      displayName: payload.displayName,
      photoURL: photoURL ?? undefined
    });

    await this.persistUserProfile(user, {
      role: currentProfile.role,
      displayName: payload.displayName,
      photoURL,
      isNew: false
    });

    const refreshedProfile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(firebaseAuth.currentUser ?? user, refreshedProfile);
  }

  private mapToAuthUser(
    user: FirebaseUser,
    profile: { role: Role; displayName?: string | null; photoURL?: string | null }
  ): AuthUser {
    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: profile.displayName ?? user.displayName ?? user.email ?? '',
      role: profile.role,
      photoURL: profile.photoURL ?? user.photoURL ?? undefined,
      accessToken: user.refreshToken
    };
  }

  private async persistUserProfile(
    user: FirebaseUser,
    profile: { role: Role; displayName: string; photoURL?: string | null; isNew?: boolean }
  ): Promise<void> {
    const userDoc = doc(firebaseFirestore, USERS_COLLECTION, user.uid);
    await setDoc(
      userDoc,
      {
        email: user.email,
        displayName: profile.displayName,
        role: profile.role,
        photoURL: profile.photoURL ?? null,
        ...(profile.isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }

  private async fetchUserProfile(
    uid: string
  ): Promise<{ role: Role; displayName?: string | null; photoURL?: string | null }> {
    const userDoc = doc(firebaseFirestore, USERS_COLLECTION, uid);
    const snapshot = await getDoc(userDoc);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        role: (data.role as Role) ?? DEFAULT_ROLE,
        displayName: (data.displayName as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null
      };
    }

    return {
      role: DEFAULT_ROLE,
      displayName: '',
      photoURL: null
    };
  }

  private async uploadProfilePhoto(uid: string, file: File): Promise<string> {
    const storageRef = ref(firebaseStorage, `${USERS_COLLECTION}/${uid}/${USER_AVATAR_FILE}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }
}
