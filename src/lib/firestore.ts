import { getDb } from "./firebase";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  addDoc,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import type { Office, QueueDay, Token, TokenStatus } from "./types";
import { getTodayStr } from "./utils";

const DEFAULT_SCHEDULE = {
  Monday: { open: "09:00", close: "17:00" },
  Tuesday: { open: "09:00", close: "17:00" },
  Wednesday: { open: "09:00", close: "17:00" },
  Thursday: { open: "09:00", close: "17:00" },
  Friday: { open: "09:00", close: "17:00" },
  Saturday: null,
  Sunday: null,
};

// Generate unique 6-char office code
export const generateOfficeCode = (name: string): string => {
  const prefix = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${suffix}`;
};

// Create office document
export const createOffice = async (
  officeData: Omit<Office, "id" | "code" | "createdAt">
): Promise<{ id: string; code: string }> => {
  const db = getDb();
  const code = generateOfficeCode(officeData.name);
  const officeRef = doc(collection(db, "offices"));
  await setDoc(officeRef, {
    ...officeData,
    code,
    createdAt: serverTimestamp(),
    dailyLimit: 100,
    serviceTypes: ["General"],
    schedule: DEFAULT_SCHEDULE,
    openDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    openTime: "09:00",
    closeTime: "17:00",
  });
  return { id: officeRef.id, code };
};

// Get office by code
export const getOfficeByCode = async (code: string): Promise<Office | null> => {
  const db = getDb();
  const q = query(collection(db, "offices"), where("code", "==", code));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Office;
};

// Get office by admin UID
export const getOfficeByAdminUid = async (uid: string): Promise<Office | null> => {
  const db = getDb();
  const q = query(collection(db, "offices"), where("adminUid", "==", uid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Office;
};

// Get today's queue document ID
export const getTodayQueueId = (officeId: string): string => {
  const today = getTodayStr();
  return `${officeId}_${today}`;
};

// Ensure today's queue exists
export const ensureTodayQueue = async (officeId: string): Promise<string> => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const queueRef = doc(db, "queues", queueId);
  const queueSnap = await getDoc(queueRef);

  if (!queueSnap.exists()) {
    await setDoc(queueRef, {
      date: getTodayStr(),
      officeId,
      isOpen: true,
      isPaused: false,
      currentToken: 0,
      totalIssued: 0,
    });
  }
  return queueId;
};

// Issue a new token
export const issueToken = async (
  officeId: string,
  name: string,
  phone: string,
  serviceType: string = "General"
): Promise<Token> => {
  const db = getDb();
  const queueId = await ensureTodayQueue(officeId);
  const queueRef = doc(db, "queues", queueId);
  const tokenRef = doc(collection(db, "queues", queueId, "tokens"));
  const officeRef = doc(db, "offices", officeId);

  return runTransaction(db, async (transaction) => {
    const [queueSnap, officeSnap] = await Promise.all([
      transaction.get(queueRef),
      transaction.get(officeRef),
    ]);
    const queueData = queueSnap.data();
    if (!queueData) throw new Error("Queue not found");
    if (queueData.isPaused) throw new Error("Queue is paused");
    if (!queueData.isOpen) throw new Error("Queue is closed");

    const officeData = officeSnap.data();
    if (officeData?.dailyLimit && queueData.totalIssued >= officeData.dailyLimit) {
      throw new Error("Daily limit reached");
    }

    const tokenNumber = (queueData.totalIssued || 0) + 1;
    const token: Token = {
      id: tokenRef.id,
      number: tokenNumber,
      name,
      phone,
      serviceType,
      status: "waiting",
      issuedAt: Timestamp.now(),
      waitMinutes: 0,
    };

    transaction.set(tokenRef, token);
    transaction.update(queueRef, { totalIssued: tokenNumber });
    return token;
  });
};

// Call next token
export const callNextToken = async (officeId: string): Promise<Token | null> => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const queueRef = doc(db, "queues", queueId);
  const queueSnap = await getDoc(queueRef);
  if (!queueSnap.exists()) return null;
  const queueData = queueSnap.data();

  // Find next waiting token
  const tokensRef = collection(db, "queues", queueId, "tokens");
  const q = query(
    tokensRef,
    where("status", "==", "waiting"),
    orderBy("number"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const tokenDoc = snapshot.docs[0];
  const tokenData = tokenDoc.data() as Token;

  await updateDoc(tokenDoc.ref, {
    status: "called",
    calledAt: Timestamp.now(),
  });

  await updateDoc(queueRef, {
    currentToken: tokenData.number,
  });

  return { ...tokenData, id: tokenDoc.id };
};

// Mark token as served
export const markServed = async (officeId: string, tokenId: string) => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const tokenRef = doc(db, "queues", queueId, "tokens", tokenId);
  const servedAt = Timestamp.now();

  const tokenSnap = await getDoc(tokenRef);
  const tokenData = tokenSnap.data();
  const calledAt = tokenData?.calledAt;
  const issuedAt = tokenData?.issuedAt;

  const waitMinutes = calledAt
    ? Math.round((servedAt.toMillis() - issuedAt.toMillis()) / 60000)
    : 0;

  await updateDoc(tokenRef, {
    status: "served",
    servedAt,
    waitMinutes,
  });
};

// Mark token as absent
export const markAbsent = async (officeId: string, tokenId: string) => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const tokenRef = doc(db, "queues", queueId, "tokens", tokenId);
  await updateDoc(tokenRef, { status: "absent" });
};

// Cancel token
export const cancelToken = async (officeId: string, tokenId: string) => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const tokenRef = doc(db, "queues", queueId, "tokens", tokenId);
  await updateDoc(tokenRef, { status: "cancelled" });
};

// Get queue stats
export const getQueueStats = async (officeId: string) => {
  const db = getDb();
  const queueId = getTodayQueueId(officeId);
  const tokensRef = collection(db, "queues", queueId, "tokens");
  const snapshot = await getDocs(tokensRef);
  const tokens = snapshot.docs.map((d) => d.data() as Token);

  const totalTokens = tokens.length;
  const served = tokens.filter((t) => t.status === "served");
  const waiting = tokens.filter((t) => t.status === "waiting" || t.status === "called");
  const completed = served.length;
  const avgTime = served.length > 0
    ? Math.round(served.reduce((a, t) => a + (t.waitMinutes || 0), 0) / served.length)
    : 0;

  return { totalTokens, waiting: waiting.length, completed, avgTime };
};

// Get tokens for date
export const getTokensForDate = async (officeId: string, dateStr: string) => {
  const db = getDb();
  const queueId = `${officeId}_${dateStr}`;
  const queueRef = doc(db, "queues", queueId);
  const queueSnap = await getDoc(queueRef);
  if (!queueSnap.exists()) return [];

  const tokensRef = collection(db, "queues", queueId, "tokens");
  const q = query(tokensRef, orderBy("number"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Token));
};
