import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean)
export const firebaseProjectId = firebaseConfig.projectId ?? ''
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null
export const firebaseAuth = app ? getAuth(app) : null
export const firestore = app ? getFirestore(app) : null

if (firebaseConfigured && app?.options?.projectId !== firebaseProjectId) {
  throw new Error('Firebase app project does not match VITE_FIREBASE_PROJECT_ID')
}

if (firebaseConfigured) {
  console.info('[Firebase] initialized', {
    projectId: firebaseProjectId,
    authDomain: firebaseConfig.authDomain,
    appProjectId: app?.options?.projectId,
  })
}

function requireFirebase(operation) {
  if (!firebaseConfigured || !firebaseAuth || !firestore) {
    throw new Error(`Firebase is not configured for ${operation}. Restart the Vite dev server after setting the VITE_FIREBASE_* variables.`)
  }
}

function organizationProfile(userId) {
  return doc(firestore, 'users', userId)
}

function organizationProfileData(firebaseUser, { name, email, organizationName, organizationType }) {
  return {
    uid: firebaseUser.uid,
    fullName: name || firebaseUser.displayName || '',
    email: email || firebaseUser.email || '',
    organizationName,
    organizationType,
    role: 'organization_member',
    accountType: 'organization',
    createdAt: serverTimestamp(),
  }
}

export async function ensureFirebaseOrganizationProfile(firebaseUser, profile) {
  requireFirebase('organization profile recovery')
  if (!firebaseUser?.uid || firebaseUser.isAnonymous) {
    throw new Error('A signed-in organization Firebase user is required for profile recovery')
  }

  const profileRef = organizationProfile(firebaseUser.uid)
  console.info('[Firebase] checking organization profile', { path: `users/${firebaseUser.uid}` })
  try {
    const snapshot = await getDoc(profileRef)
    if (!snapshot.exists()) {
      console.info('[Firebase] creating missing organization profile', { path: `users/${firebaseUser.uid}` })
      await setDoc(profileRef, organizationProfileData(firebaseUser, profile))
    }
    return snapshot.exists() ? snapshot.data() : profile
  } catch (error) {
    console.error('[Firebase] organization profile recovery failed', {
      code: error?.code ?? 'unknown',
      path: `users/${firebaseUser.uid}`,
    })
    throw error
  }
}

export async function getFirebaseOrganizationProfile(firebaseUser) {
  requireFirebase('organization profile lookup')
  if (!firebaseUser?.uid || firebaseUser.isAnonymous) {
    throw new Error('A signed-in organization Firebase user is required for profile lookup')
  }
  const snapshot = await getDoc(organizationProfile(firebaseUser.uid))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createFirebaseOrganizationUser({ name, email, password, organizationName, organizationType }) {
  requireFirebase('organization registration')
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    await updateProfile(credential.user, { displayName: name })
    const profileRef = organizationProfile(credential.user.uid)
    console.info('[Firebase] creating organization profile', { path: `users/${credential.user.uid}` })
    await setDoc(profileRef, organizationProfileData(credential.user, { name, email, organizationName, organizationType }))
    return credential.user
  } catch (error) {
    console.error('[Firebase] organization registration failed', {
      code: error?.code ?? 'unknown',
    })
    throw error
  }
}

export async function signInFirebaseUser(email, password) {
  requireFirebase('organization login')
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
  return credential.user
}

export async function getFirebaseIdToken(firebaseUser) {
  requireFirebase('backend session exchange')
  if (!firebaseUser?.uid || firebaseUser.isAnonymous) {
    throw new Error('A signed-in organization Firebase user is required for backend session exchange')
  }
  return firebaseUser.getIdToken(true)
}

export async function signOutFirebaseUser() {
  if (firebaseAuth) await signOut(firebaseAuth)
}

export async function ensureAnonymousCitizen() {
  if (!firebaseAuth) return null
  if (firebaseAuth.currentUser?.isAnonymous) return firebaseAuth.currentUser
  const credential = await signInAnonymously(firebaseAuth)
  return credential.user
}

export function watchCitizenScans(userId, onCount, onError) {
  if (!firestore || !userId) return () => {}
  return onSnapshot(
    collection(firestore, 'users', userId, 'scans'),
    snapshot => onCount(snapshot.size),
    onError,
  )
}

export async function recordCitizenScan(userId, riskClassification) {
  if (!firestore || !userId) return
  await addDoc(collection(firestore, 'users', userId, 'scans'), {
    userId,
    timestamp: serverTimestamp(),
    riskClassification,
  })
}

export { onAuthStateChanged }
