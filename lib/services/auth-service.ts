import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const credentials = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credentials.user, { displayName });
  await sendEmailVerification(credentials.user);
  return credentials.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  return credentials.user;
}

export async function resendVerificationEmail() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No authenticated user found");
  }

  await sendEmailVerification(currentUser);
}

export async function reloadCurrentUser() {
  if (!auth.currentUser) {
    return null;
  }

  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function deleteCurrentUserAccount() {
  if (!auth.currentUser) {
    return;
  }

  await deleteUser(auth.currentUser);
}

export async function signOutCurrentUser() {
  await signOut(auth);
}
