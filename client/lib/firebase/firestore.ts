import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  DocumentReference,
  CollectionReference,
  Query,
  WhereFilterOp,
  OrderByDirection,
} from "firebase/firestore";
import { db } from "./config";

// Create a new document with auto-generated ID
export const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<DocumentReference<T>> => {
  const collectionRef = collection(db, collectionName) as CollectionReference<T>;
  return await addDoc(collectionRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Create or set a document with a specific ID
export const setDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  merge = false
): Promise<void> => {
  const docRef = doc(db, collectionName, docId) as DocumentReference<T>;
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge }
  );
};

// Get a single document
export const getDocument = async <T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, docId) as DocumentReference<T>;
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as T) : null;
};

// Update a document
export const updateDocument = async <T extends Partial<DocumentData>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Delete a document
export const deleteDocument = async (
  collectionName: string,
  docId: string
): Promise<void> => {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
};

// Get all documents in a collection
export const getAllDocuments = async <T extends DocumentData>(
  collectionName: string
): Promise<T[]> => {
  const collectionRef = collection(db, collectionName) as CollectionReference<T>;
  const querySnapshot = await getDocs(collectionRef);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

// Query documents with filters
export const queryDocuments = async <T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> => {
  const collectionRef = collection(db, collectionName) as CollectionReference<T>;
  const q = query(collectionRef, ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

// Real-time listener for a document
export const subscribeToDocument = <T extends DocumentData>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionName, docId) as DocumentReference<T>;
  return onSnapshot(docRef, (docSnap) => {
    callback(docSnap.exists() ? (docSnap.data() as T) : null);
  });
};

// Real-time listener for a collection
export const subscribeToCollection = <T extends DocumentData>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe => {
  const collectionRef = collection(db, collectionName) as CollectionReference<T>;
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  
  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
    callback(documents);
  });
};

// Helper function to create query constraints
export const createQueryConstraints = {
  where: (field: string, operator: WhereFilterOp, value: unknown) =>
    where(field, operator, value),
  orderBy: (field: string, direction?: OrderByDirection) =>
    orderBy(field, direction),
  limit: (limitCount: number) => limit(limitCount),
  startAfter: (snapshot: unknown) => startAfter(snapshot),
};

// Export Firestore timestamp helpers
export { serverTimestamp, Timestamp };
