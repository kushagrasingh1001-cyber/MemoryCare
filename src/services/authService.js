import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeInviteCode(length = 8) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, n => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

async function createUniqueInviteCode(transaction, groupId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeInviteCode();
    const ref = doc(db, 'inviteCodes', code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return { code, ref };
  }
  throw new Error('Could not generate a unique invite code. Please try again.');
}

export async function signupPatient({ name, email, password, phone = '' }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  const groupId = `group_${user.uid}`;

  try {
    const inviteCode = await runTransaction(db, async transaction => {
      const userRef = doc(db, 'users', user.uid);
      const groupRef = doc(db, 'groups', groupId);
      const { code, ref: inviteRef } = await createUniqueInviteCode(transaction, groupId);

      transaction.set(groupRef, {
        groupId,
        patientUid: user.uid,
        caregiverUids: [],
        inviteCode: code,
        createdAt: serverTimestamp(),
      });

      transaction.set(userRef, {
        uid: user.uid,
        name: name.trim(),
        email: user.email || email.trim(),
        phone: phone.trim(),
        role: 'patient',
        groupId,
        createdAt: serverTimestamp(),
        lastActiveTimestamp: serverTimestamp(),
        lastActivityType: 'signup',
        currentDifficultyLevel: { memory: 1, attention: 1, routine: 1, wordRecall: 1, numberSequence: 1 },
      });

      transaction.set(inviteRef, {
        groupId,
        patientUid: user.uid,
        createdAt: serverTimestamp(),
      });

      return code;
    });

    return { groupId, inviteCode };
  } catch (error) {
    await deleteUser(user).catch(() => {});
    throw error;
  }
}

export async function signupCaregiver({ name, email, password, inviteCode, phone = '' }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  const code = inviteCode.trim().toUpperCase();

  try {
    const result = await runTransaction(db, async transaction => {
      const inviteRef = doc(db, 'inviteCodes', code);
      const inviteSnap = await transaction.get(inviteRef);
      if (!inviteSnap.exists()) throw new Error('Invalid invite code.');

      const { groupId } = inviteSnap.data();
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await transaction.get(groupRef);
      if (!groupSnap.exists()) throw new Error('Patient group no longer exists.');

      const group = groupSnap.data();
      const caregivers = Array.isArray(group.caregiverUids) ? group.caregiverUids : [];
      if (caregivers.length >= 4) throw new Error('This patient group already has four caregivers.');
      if (caregivers.includes(user.uid)) return { groupId };

      const userRef = doc(db, 'users', user.uid);
      transaction.set(userRef, {
        uid: user.uid,
        name: name.trim(),
        email: user.email || email.trim(),
        phone: phone.trim(),
        role: 'caregiver',
        groupId,
        createdAt: serverTimestamp(),
      });

      transaction.update(groupRef, {
        caregiverUids: [...caregivers, user.uid],
      });

      return { groupId };
    });

    return result;
  } catch (error) {
    await deleteUser(user).catch(() => {});
    throw error;
  }
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
