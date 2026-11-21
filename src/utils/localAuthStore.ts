import type { AuthUser, UserRole } from '../types';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAtIso: string;
  lastActiveAtIso: string;
}

interface StoredSession {
  id: string;
  tokenHash: string;
  userId: string;
  scope: 'user' | 'admin';
  expiresAtIso: string;
  createdAtIso: string;
}

interface StoredResetToken {
  id: string;
  tokenHash: string;
  userId: string;
  email: string;
  expiresAtIso: string;
  used: boolean;
}

interface LocalAuthDatabase {
  users: StoredUser[];
  sessions: StoredSession[];
  resetTokens: StoredResetToken[];
  adminResetTokens: StoredResetToken[];
}

const AUTH_DB_KEY = 'shopsync_auth_db_v1';
const USER_SESSION_KEY = 'shopsync_auth_token_v1';
const ADMIN_SESSION_KEY = 'shopsync_admin_token_v1';

function loadDb(): LocalAuthDatabase {
  try {
    const raw = window.localStorage.getItem(AUTH_DB_KEY);
    if (!raw) {
      return { users: [], sessions: [], resetTokens: [], adminResetTokens: [] };
    }
    const parsed = JSON.parse(raw) as Partial<LocalAuthDatabase>;
    const users = Array.isArray(parsed.users)
      ? parsed.users.map((u) => ({
          ...u,
          role: (u.role === 'admin' ? 'admin' : 'user') as UserRole,
          lastActiveAtIso: u.lastActiveAtIso || u.createdAtIso || new Date().toISOString(),
        }))
      : [];
    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.map((s) => ({
          ...s,
          scope: (s.scope === 'admin' ? 'admin' : 'user') as 'user' | 'admin',
        }))
      : [];
    return {
      users,
      sessions,
      resetTokens: Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [],
      adminResetTokens: Array.isArray(parsed.adminResetTokens) ? parsed.adminResetTokens : [],
    };
  } catch {
    return { users: [], sessions: [], resetTokens: [], adminResetTokens: [] };
  }
}

function saveDb(database: LocalAuthDatabase): void {
  try {
    window.localStorage.setItem(AUTH_DB_KEY, JSON.stringify(database));
  } catch {
    // ignore storage quota errors
  }
}

function sanitizeUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
    createdAtIso: user.createdAtIso,
    lastActiveAtIso: user.lastActiveAtIso,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateId(): string {
  if (typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${randomHex(8)}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback for restricted non-secure origins without SubtleCrypto
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  const derived = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${derived}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.trim().split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const actualHex = await sha256Hex(`${salt}:${password}`);
  return constantTimeEqual(expectedHex, actualHex);
}

function purgeExpiredRecords(db: LocalAuthDatabase): void {
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAtIso).getTime() > now);
  db.resetTokens = db.resetTokens.filter(
    (t) => !t.used && new Date(t.expiresAtIso).getTime() > now,
  );
  db.adminResetTokens = db.adminResetTokens.filter(
    (t) => !t.used && new Date(t.expiresAtIso).getTime() > now,
  );
}

async function createSessionForUser(
  db: LocalAuthDatabase,
  userId: string,
  scope: 'user' | 'admin',
): Promise<string> {
  purgeExpiredRecords(db);
  const rawToken = randomHex(32);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  db.sessions.push({
    id: generateId(),
    tokenHash: await sha256Hex(rawToken),
    userId,
    scope,
    createdAtIso: now.toISOString(),
    expiresAtIso: expires.toISOString(),
  });
  saveDb(db);
  return rawToken;
}

export function readStoredUserToken(): string | null {
  try {
    return window.localStorage.getItem(USER_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeStoredUserToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(USER_SESSION_KEY, token);
    } else {
      window.localStorage.removeItem(USER_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function readStoredAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAdminConfigStatusLocal(): {
  hasAdminAccount: boolean;
  setupRequired: boolean;
} {
  const db = loadDb();
  const hasAdminAccount = db.users.some((u) => u.role === 'admin');
  return {
    hasAdminAccount,
    setupRequired: !hasAdminAccount,
  };
}

export async function setupInitialAdminLocal(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<
  | { ok: true; user: AuthUser; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const db = loadDb();
  if (db.users.some((u) => u.role === 'admin')) {
    return {
      ok: false,
      status: 403,
      error: 'Administrator setup is locked because an authorized administrator already exists.',
    };
  }

  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (fullName.length < 2) {
    return {
      ok: false,
      status: 400,
      error: 'Please enter administrator full name (at least 2 characters).',
    };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid administrator email address.' };
  }
  const passwordErr = validatePasswordStrength(password);
  if (passwordErr) {
    return { ok: false, status: 400, error: passwordErr };
  }
  if (password !== confirmPassword) {
    return { ok: false, status: 400, error: 'Password and Confirm Password do not match.' };
  }

  if (db.users.some((u) => u.email === email)) {
    return {
      ok: false,
      status: 409,
      error: 'This email is already registered as a standard user account. Please use a dedicated admin email.',
    };
  }

  const nowIso = new Date().toISOString();
  const adminUser: StoredUser = {
    id: generateId(),
    fullName,
    email,
    role: 'admin',
    passwordHash: await hashPassword(password),
    createdAtIso: nowIso,
    lastActiveAtIso: nowIso,
  };

  db.users.push(adminUser);
  const sessionToken = await createSessionForUser(db, adminUser.id, 'admin');
  writeStoredAdminToken(sessionToken);

  return { ok: true, user: sanitizeUser(adminUser), sessionToken };
}

export async function registerUserLocal(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<
  | { ok: true; user: AuthUser; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (fullName.length < 2) {
    return { ok: false, status: 400, error: 'Please enter your full name (at least 2 characters).' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  const passwordErr = validatePasswordStrength(password);
  if (passwordErr) {
    return { ok: false, status: 400, error: passwordErr };
  }
  if (password !== confirmPassword) {
    return { ok: false, status: 400, error: 'Password and Confirm Password do not match.' };
  }

  const db = loadDb();
  if (db.users.some((u) => u.email === email)) {
    return {
      ok: false,
      status: 409,
      error: 'An account with this email address already exists. Please log in instead.',
    };
  }

  const nowIso = new Date().toISOString();
  const newUser: StoredUser = {
    id: generateId(),
    fullName,
    email,
    role: 'user',
    passwordHash: await hashPassword(password),
    createdAtIso: nowIso,
    lastActiveAtIso: nowIso,
  };

  db.users.push(newUser);
  const sessionToken = await createSessionForUser(db, newUser.id, 'user');
  writeStoredUserToken(sessionToken);

  return { ok: true, user: sanitizeUser(newUser), sessionToken };
}

export async function loginUserLocal(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; user: AuthUser; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  if (!password) {
    return { ok: false, status: 400, error: 'Please enter your password.' };
  }

  const db = loadDb();
  const user = db.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, status: 401, error: 'Invalid email address or password.' };
  }
  if (user.role === 'admin') {
    return {
      ok: false,
      status: 403,
      error: 'Administrator accounts must sign in through the Admin Portal.',
    };
  }

  user.lastActiveAtIso = new Date().toISOString();
  const sessionToken = await createSessionForUser(db, user.id, 'user');
  writeStoredUserToken(sessionToken);

  return { ok: true, user: sanitizeUser(user), sessionToken };
}

export async function loginAdminLocal(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; user: AuthUser; sessionToken: string }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid administrator email address.' };
  }
  if (!password) {
    return { ok: false, status: 400, error: 'Please enter your administrator password.' };
  }

  const db = loadDb();
  if (!db.users.some((u) => u.role === 'admin')) {
    return {
      ok: false,
      status: 503,
      error: 'No authorized administrator is configured yet. Complete first-time admin setup below.',
    };
  }

  const user = db.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, status: 401, error: 'Invalid email or password.' };
  }
  if (user.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      error: 'Access denied. Only authorized administrator accounts can access the Admin Portal.',
    };
  }

  user.lastActiveAtIso = new Date().toISOString();
  const sessionToken = await createSessionForUser(db, user.id, 'admin');
  writeStoredAdminToken(sessionToken);

  return { ok: true, user: sanitizeUser(user), sessionToken };
}

export async function getUserBySessionTokenLocal(
  token: string | null | undefined,
): Promise<AuthUser | null> {
  if (!token || !token.trim()) return null;
  const db = loadDb();
  purgeExpiredRecords(db);
  const tokenHash = await sha256Hex(token.trim());
  const session = db.sessions.find((s) => s.tokenHash === tokenHash && s.scope === 'user');
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId && u.role === 'user');
  if (!user) return null;
  user.lastActiveAtIso = new Date().toISOString();
  saveDb(db);
  return sanitizeUser(user);
}

export async function getAdminBySessionTokenLocal(
  token: string | null | undefined,
): Promise<AuthUser | null> {
  if (!token || !token.trim()) return null;
  const db = loadDb();
  purgeExpiredRecords(db);
  const tokenHash = await sha256Hex(token.trim());
  const session = db.sessions.find((s) => s.tokenHash === tokenHash && s.scope === 'admin');
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId && u.role === 'admin');
  if (!user) return null;
  user.lastActiveAtIso = new Date().toISOString();
  saveDb(db);
  return sanitizeUser(user);
}

export async function logoutBySessionTokenLocal(
  token: string | null | undefined,
  scope?: 'user' | 'admin',
): Promise<void> {
  if (scope === 'admin') {
    writeStoredAdminToken(null);
  } else if (scope === 'user') {
    writeStoredUserToken(null);
  }
  if (!token || !token.trim()) return;
  const db = loadDb();
  const tokenHash = await sha256Hex(token.trim());
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => {
    if (s.tokenHash !== tokenHash) return true;
    if (scope && s.scope !== scope) return true;
    return false;
  });
  if (db.sessions.length !== before) {
    saveDb(db);
  }
}

export function getAdminUserRosterLocal(): Array<AuthUser & { isActiveNow: boolean }> {
  const db = loadDb();
  purgeExpiredRecords(db);
  const activeSessionUserIds = new Set(db.sessions.map((s) => s.userId));
  const now = Date.now();
  const activeWindowMs = 15 * 60 * 1000;

  return db.users
    .map((u) => {
      const lastActiveMs = new Date(u.lastActiveAtIso || u.createdAtIso).getTime();
      const isActiveNow =
        activeSessionUserIds.has(u.id) && now - lastActiveMs <= activeWindowMs;
      return {
        ...sanitizeUser(u),
        isActiveNow,
      };
    })
    .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
}

export async function requestPasswordResetLocal(emailInput: string): Promise<
  | { ok: true; resetCode: string; email: string }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }

  const db = loadDb();
  const user = db.users.find((u) => u.email === email && u.role === 'user');
  if (!user) {
    return {
      ok: false,
      status: 404,
      error: 'No account found with that email address. Please register first.',
    };
  }

  purgeExpiredRecords(db);
  db.resetTokens = db.resetTokens.filter((t) => t.userId !== user.id);

  const resetCode = randomHex(4).toUpperCase();
  const expiresAtIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.resetTokens.push({
    id: generateId(),
    tokenHash: await sha256Hex(resetCode),
    userId: user.id,
    email: user.email,
    expiresAtIso,
    used: false,
  });
  saveDb(db);

  return { ok: true, resetCode, email: user.email };
}

export async function completePasswordResetLocal(input: {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const email = normalizeEmail(input.email);
  const resetCode = input.resetCode.trim().toUpperCase();

  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  if (!resetCode) {
    return { ok: false, status: 400, error: 'Please enter your verification reset code.' };
  }
  const passwordErr = validatePasswordStrength(input.newPassword);
  if (passwordErr) {
    return { ok: false, status: 400, error: passwordErr };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, status: 400, error: 'New Password and Confirm Password do not match.' };
  }

  const db = loadDb();
  purgeExpiredRecords(db);
  const user = db.users.find((u) => u.email === email && u.role === 'user');
  if (!user) {
    return { ok: false, status: 404, error: 'Account not found.' };
  }

  const candidateHash = await sha256Hex(resetCode);
  const tokenRecord = db.resetTokens.find(
    (t) => t.userId === user.id && !t.used && constantTimeEqual(t.tokenHash, candidateHash),
  );
  if (!tokenRecord) {
    return { ok: false, status: 400, error: 'Invalid or expired password reset code.' };
  }

  user.passwordHash = await hashPassword(input.newPassword);
  tokenRecord.used = true;
  db.sessions = db.sessions.filter((s) => !(s.userId === user.id && s.scope === 'user'));
  saveDb(db);

  return { ok: true };
}

export async function requestAdminPasswordResetLocal(emailInput: string): Promise<
  | { ok: true; resetLink: string; email: string; expiresAtIso: string }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid administrator email address.' };
  }

  const db = loadDb();
  const adminUser = db.users.find((u) => u.email === email && u.role === 'admin');
  if (!adminUser) {
    return {
      ok: false,
      status: 404,
      error: 'No authorized administrator account matches that email address.',
    };
  }

  purgeExpiredRecords(db);
  db.adminResetTokens = db.adminResetTokens.filter((t) => t.userId !== adminUser.id);

  const resetToken = randomHex(24);
  const expiresAtIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.adminResetTokens.push({
    id: generateId(),
    tokenHash: await sha256Hex(resetToken),
    userId: adminUser.id,
    email: adminUser.email,
    expiresAtIso,
    used: false,
  });
  saveDb(db);

  const resetLink = `${window.location.origin}/admin?resetToken=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(adminUser.email)}`;
  return { ok: true, resetLink, email: adminUser.email, expiresAtIso };
}

export async function completeAdminPasswordResetLocal(input: {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const email = normalizeEmail(input.email);
  const resetToken = input.resetToken.trim();

  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid administrator email address.' };
  }
  if (!resetToken) {
    return { ok: false, status: 400, error: 'Invalid or missing administrator reset token.' };
  }
  const passwordErr = validatePasswordStrength(input.newPassword);
  if (passwordErr) {
    return { ok: false, status: 400, error: passwordErr };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, status: 400, error: 'New Password and Confirm Password do not match.' };
  }

  const db = loadDb();
  purgeExpiredRecords(db);
  const adminUser = db.users.find((u) => u.email === email && u.role === 'admin');
  if (!adminUser) {
    return { ok: false, status: 404, error: 'Authorized administrator account not found.' };
  }

  const candidateHash = await sha256Hex(resetToken);
  const tokenRecord = db.adminResetTokens.find(
    (t) =>
      t.userId === adminUser.id && !t.used && constantTimeEqual(t.tokenHash, candidateHash),
  );
  if (!tokenRecord) {
    return { ok: false, status: 400, error: 'Invalid or expired administrator password reset link.' };
  }

  adminUser.passwordHash = await hashPassword(input.newPassword);
  tokenRecord.used = true;
  db.sessions = db.sessions.filter((s) => !(s.userId === adminUser.id && s.scope === 'admin'));
  writeStoredAdminToken(null);
  saveDb(db);

  return { ok: true };
}
