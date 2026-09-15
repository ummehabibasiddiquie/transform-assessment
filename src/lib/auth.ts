import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const STAFF_COOKIE = "staff_session";
const CANDIDATE_COOKIE = "candidate_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export type StaffSession = {
  type: "staff";
  userId: string;
  role: string;
  name: string;
  email: string;
};

export type CandidateSession = {
  type: "candidate";
  candidateId: string;
  inviteToken: string;
  attemptId?: string;
};

async function sign(payload: StaffSession | CandidateSession) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

async function read<T>(name: string): Promise<T | null> {
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

export async function getStaffSession() {
  const session = await read<StaffSession>(STAFF_COOKIE);
  return session?.type === "staff" ? session : null;
}

export async function getCandidateSession() {
  const session = await read<CandidateSession>(CANDIDATE_COOKIE);
  return session?.type === "candidate" ? session : null;
}

export async function setStaffSession(session: StaffSession) {
  const jar = await cookies();
  jar.set(STAFF_COOKIE, await sign(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setCandidateSession(session: CandidateSession) {
  const jar = await cookies();
  jar.set(CANDIDATE_COOKIE, await sign(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 2,
  });
}

export async function clearStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function clearCandidateSession() {
  (await cookies()).delete(CANDIDATE_COOKIE);
}

export async function requireStaff() {
  const session = await getStaffSession();
  if (!session) return null;
  return session;
}
