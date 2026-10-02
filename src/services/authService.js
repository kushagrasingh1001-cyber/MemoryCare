import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const homeRouteForRole = role =>
  role === 'patient' ? '/patient/home' : role === 'caregiver' ? '/caregiver/dashboard' : '/login';

function makeInviteCode(length = 8) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, n => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

async function createUniqueInviteCode(transaction) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeInviteCode();
    const ref = doc(db, 'inviteCodes', code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return { code, ref };
  }
  throw new Error('Could not generate a unique invite code. Please try again.');
}

/**
 * Reads the user profile document once. Used right after sign-in so the app can
 * route by the role stored in Firestore instead of guessing from React state.
 */
export async function fetchUserProfile(uid, { timeoutMs = 8000 } = {}) {
  if (!uid) return null;
  const read = getDoc(doc(db, 'users', uid)).then(s => (s.exists() ? { uid, ...s.data() } : null));
  const timeout = new Promise(resolve => setTimeout(() => resolve('timeout'), timeoutMs));
  const result = await Promise.race([read.catch(() => 'error'), timeout]);
  return result === 'timeout' || result === 'error' ? null : result;
}

export async function signupPatient({ name, email, password, phone = '' }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  const groupId = `group_${user.uid}`;

  try {
    const inviteCode = await runTransaction(db, async transaction => {
      const userRef = doc(db, 'users', user.uid);
      const groupRef = doc(db, 'groups', groupId);
      const { code, ref: inviteRef } = await createUniqueInviteCode(transaction);

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
        stats: { gamesPlayedTotal: 0, medicineAcknowledgedTotal: 0, hydrationAcknowledgedTotal: 0 },
        currentDifficultyLevel: { memory: 1, attention: 1, routine: 1, wordRecall: 1, numberSequence: 1 },
      });

      transaction.set(inviteRef, {
        groupId,
        patientUid: user.uid,
        createdAt: serverTimestamp(),
      });

      return code;
    });

    return { groupId, inviteCode, role: 'patient' };
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
      if (!inviteSnap.exists()) throw new Error('INVALID_INVITE_CODE');

      const { groupId } = inviteSnap.data();
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await transaction.get(groupRef);
      if (!groupSnap.exists()) throw new Error('GROUP_MISSING');

      const group = groupSnap.data();
      const caregivers = Array.isArray(group.caregiverUids) ? group.caregiverUids : [];
      if (caregivers.includes(user.uid)) return { groupId };

      if (caregivers.length >= 4) throw new Error('GROUP_FULL');

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
        lastJoin: { code, uid: user.uid, at: serverTimestamp() },
      });

      return { groupId };
    });

    return { ...result, role: 'caregiver' };
  } catch (error) {
    await deleteUser(user).catch(() => {});
    throw error;
  }
}

/**
 * Signs in and immediately resolves the *stored* role, so a caregiver can never
 * land on the patient screens (and the other way round).
 */
export async function loginAndResolve(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchUserProfile(credential.user.uid);
  return { user: credential.user, profile, home: profile ? homeRouteForRole(profile.role) : '/' };
}

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const resetPassword = email => sendPasswordResetEmail(auth, email);

/**
 * Removes a caregiver from the patient's group. Only the patient owning the
 * group can do this (enforced in Firestore rules too).
 */
export async function removeCaregiverFromGroup({ groupId, caregiverUid }) {
  if (!groupId || !caregiverUid) throw new Error('MISSING_ARGUMENTS');
  await runTransaction(db, async transaction => {
    const groupRef = doc(db, 'groups', groupId);
    const userRef = doc(db, 'users', caregiverUid);
    const [groupSnap, userSnap] = [await transaction.get(groupRef), await transaction.get(userRef)];
    if (!groupSnap.exists()) throw new Error('GROUP_MISSING');

    const caregivers = Array.isArray(groupSnap.data().caregiverUids) ? groupSnap.data().caregiverUids : [];
    if (!caregivers.includes(caregiverUid)) return;

    transaction.update(groupRef, { caregiverUids: caregivers.filter(uid => uid !== caregiverUid) });
    if (userSnap.exists()) {
      transaction.update(userRef, { groupId: null, removedFromGroupAt: serverTimestamp() });
    }
  });
}

/** A caregiver leaves a care space on their own. */
export async function leaveGroup({ groupId, uid }) {
  if (!groupId || !uid) throw new Error('MISSING_ARGUMENTS');
  await runTransaction(db, async transaction => {
    const groupRef = doc(db, 'groups', groupId);
    const userRef = doc(db, 'users', uid);
    const groupSnap = await transaction.get(groupRef);
    if (groupSnap.exists()) {
      const caregivers = Array.isArray(groupSnap.data().caregiverUids) ? groupSnap.data().caregiverUids : [];
      if (caregivers.includes(uid)) {
        transaction.update(groupRef, { caregiverUids: caregivers.filter(x => x !== uid) });
      }
    }
    transaction.set(userRef, { groupId: null, leftGroupAt: serverTimestamp() }, { merge: true });
  });
}

/**
 * Re-joins (or repairs) a caregiver account that is signed in but has no active
 * group — for example after the patient removed them.
 *
 * The group document is intentionally NOT read here (the rules only allow members
 * to read it). The invite code is resolved through inviteCodes/{code} and the
 * update echoes the code in `lastJoin`, which the rules verify.
 */
export async function rejoinGroup({ user: authUser, inviteCode, name = '', phone = '' }) {
  const uid = authUser.uid;
  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error('INVALID_INVITE_CODE');

  const inviteSnap = await getDoc(doc(db, 'inviteCodes', code));
  if (!inviteSnap.exists()) throw new Error('INVALID_INVITE_CODE');
  const groupId = inviteSnap.data().groupId;
  if (!groupId) throw new Error('GROUP_MISSING');

  const groupRef = doc(db, 'groups', groupId);
  let alreadyMember = false;
  try {
    await updateDoc(groupRef, {
      caregiverUids: arrayUnion(uid),
      lastJoin: { code, uid, at: serverTimestamp() },
    });
  } catch (error) {
    if (error?.code !== 'permission-denied') throw error;
    // Either the group is full, or this account is already one of its caregivers.
    const mine = await fetchUserProfile(uid);
    alreadyMember = mine?.groupId === groupId;
    if (!alreadyMember) {
      if (error.message?.includes('permission')) throw new Error('GROUP_FULL');
      throw error;
    }
  }

  const previous = (await fetchUserProfile(uid)) || {};
  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      name: name.trim() || previous.name || '',
      phone: phone.trim() || previous.phone || '',
      email: previous.email || authUser.email || '',
      role: 'caregiver',
      groupId,
      createdAt: previous.createdAt || serverTimestamp(),
      joinedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { groupId, role: 'caregiver' };
}

/**
 * Recreates a patient profile document from the patient group, for accounts whose
 * profile write failed during signup but whose group exists.
 */
export async function restorePatientProfile(uid) {
  const groupRef = doc(db, 'groups', `group_${uid}`);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('GROUP_MISSING');
  const group = groupSnap.data();
  if (group.patientUid !== uid) throw new Error('NOT_GROUP_OWNER');

  await setDoc(doc(db, 'users', uid), {
    uid,
    name: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    phone: '',
    role: 'patient',
    groupId: groupSnap.id,
    createdAt: serverTimestamp(),
    lastActiveTimestamp: serverTimestamp(),
    lastActivityType: 'profile_restored',
    currentDifficultyLevel: { memory: 1, attention: 1, routine: 1, wordRecall: 1, numberSequence: 1 },
  }, { merge: true });

  return { groupId: groupSnap.id, role: 'patient' };
}

/** Turns Firebase error codes into translation keys the UI can show. */
export function authErrorKey(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  if (message === 'INVALID_INVITE_CODE') return 'errInvalidInviteCode';
  if (message === 'GROUP_FULL') return 'errGroupFull';
  if (message === 'GROUP_MISSING') return 'errGeneric';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'errInvalidCredential';
    case 'auth/user-disabled':
      return 'errUserDisabled';
    case 'auth/too-many-requests':
      return 'errTooManyRequests';
    case 'auth/network-request-failed':
      return 'errNetwork';
    case 'auth/email-already-in-use':
      return 'errEmailInUse';
    case 'auth/weak-password':
      return 'errWeakPassword';
    case 'auth/invalid-email':
      return 'errInvalidEmail';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'errConfig';
    default:
      return 'errGeneric';
  }
}
