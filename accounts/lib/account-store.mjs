import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { benefitsConfig, creditOrderRewards, reverseOrderRewards } from "./benefits-engine.mjs";

export const accountConfig = {
  meta: { mode: "safe_test", storage: "memory_only_test" },
  accountTypes: ["regular", "student", "business"],
  rewards: { status: "terms_pending", pointsPerDollar: null, pointsPerDollarReward: null },
  studentVerification: { mode: "manual_review_test", methods: ["school_email"], affiliationDisclaimer: "No university sponsorship or affiliation is implied." },
  privacy: { persistence: "Server memory resets on restart", exportAvailable: true, deletionAvailable: true },
  authentication: { cookieName: "stj_session", sessionHours: 8, passwordMinimumCharacters: 12, loginWindowMinutes: 15, loginMaximumAttempts: 8, emailVerification: "not_connected_test" }
};

const accounts = new Map(), byEmail = new Map(), sessions = new Map(), attempts = new Map();
const clean = (v, n = 200) => String(v || "").trim().slice(0, n);
const fail = (message, code, status = 400, field) => { throw Object.assign(new Error(message), { code, status, field }); };
const hashPassword = (password, salt = randomBytes(16).toString("hex")) => ({ salt, hash: scryptSync(password, salt, 64).toString("hex") });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const normalizeBirthday = (value) => {
  const birthday = clean(value, 10);
  if (!birthday) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) fail("Birthday must use YYYY-MM-DD.", "birthday_invalid", 422, "birthday");
  const date = new Date(`${birthday}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthday) fail("Choose a valid birthday.", "birthday_invalid", 422, "birthday");
  if (date.getTime() > Date.now()) fail("Birthday cannot be in the future.", "birthday_future", 422, "birthday");
  return birthday;
};

export function parseCookies(header = "") { return Object.fromEntries(String(header).split(";").map((part) => part.trim().split("=")).filter(([key]) => key)); }
export function authRateLimit(key) { const now = Date.now(), windowMs = accountConfig.authentication.loginWindowMinutes * 60_000, row = attempts.get(key) || { count: 0, reset: now + windowMs }; if (row.reset < now) Object.assign(row, { count: 0, reset: now + windowMs }); if (++row.count > accountConfig.authentication.loginMaximumAttempts) fail("Too many sign-in attempts. Try again later.", "rate_limited", 429); attempts.set(key, row); }
export function clearAuthAttempts(key) { attempts.delete(key); }

export function registerAccount(input = {}) {
  const email = clean(input.email).toLowerCase(), name = clean(input.name, 100), password = String(input.password || ""), type = accountConfig.accountTypes.includes(input.type) ? input.type : "regular";
  if (!validEmail(email)) fail("Enter a valid email.", "email_invalid", 422, "email");
  if (name.length < 2) fail("Enter your name.", "name_required", 422, "name");
  if (password.length < accountConfig.authentication.passwordMinimumCharacters) fail("Password is too short.", "password_short", 422, "password");
  if (byEmail.has(email)) fail("An account already exists for this email.", "email_exists", 409, "email");
  const account = { id: `acct_${randomUUID()}`, email, name, phone: clean(input.phone, 40), type, birthday: normalizeBirthday(input.birthday), password: hashPassword(password), createdAt: new Date().toISOString(), favorites: [], mixes: [], addresses: [], events: [], reservations: [], orderIds: [], rewards: { enrolled: false, points: 0, consentAt: null, ledger: [], grants: [] }, student: { status: "not_submitted" }, business: { status: "not_submitted" } };
  accounts.set(account.id, account); byEmail.set(email, account.id); return account;
}

export function authenticate(emailInput, passwordInput) { const email = clean(emailInput).toLowerCase(), account = accounts.get(byEmail.get(email)); if (!account) fail("Email or password is incorrect.", "credentials_invalid", 401); const check = hashPassword(String(passwordInput || ""), account.password.salt); if (!timingSafeEqual(Buffer.from(check.hash, "hex"), Buffer.from(account.password.hash, "hex"))) fail("Email or password is incorrect.", "credentials_invalid", 401); return account; }
export function createSession(accountId) { const token = randomBytes(32).toString("base64url"), session = { token, accountId, csrfToken: randomBytes(24).toString("base64url"), expiresAt: Date.now() + accountConfig.authentication.sessionHours * 3600000 }; sessions.set(token, session); return session; }
export function destroySession(token) { sessions.delete(token); }
export function sessionForRequest(request) { const token = parseCookies(request.headers.cookie || "")[accountConfig.authentication.cookieName], session = sessions.get(token); if (!session || session.expiresAt <= Date.now()) { if (token) sessions.delete(token); return null; } const account = accounts.get(session.accountId); return account ? { session, account } : null; }
export function requireAccount(request, { csrf = false } = {}) { const resolved = sessionForRequest(request); if (!resolved) fail("Sign in is required.", "authentication_required", 401); if (csrf && request.headers["x-csrf-token"] !== resolved.session.csrfToken) fail("The account request could not be verified.", "csrf_invalid", 403); return resolved; }
export function publicAccount(account) { return { id: account.id, email: account.email, name: account.name, phone: account.phone, type: account.type, birthday: account.birthday, createdAt: account.createdAt, rewards: { enrolled: Boolean(account.rewards?.enrolled), points: Number(account.rewards?.points || 0), consentAt: account.rewards?.consentAt || null }, student: account.student, business: account.business }; }
export function accountCollections(account) { return { favorites: [...account.favorites], mixes: structuredClone(account.mixes), addresses: structuredClone(account.addresses), events: structuredClone(account.events), reservations: structuredClone(account.reservations || []) }; }
export function updateProfile(account, input = {}) { if (input.name != null) account.name = clean(input.name, 100); if (input.phone != null) account.phone = clean(input.phone, 40); if (input.birthday != null) account.birthday = normalizeBirthday(input.birthday); return account; }
export function setFavorite(account, productId, active = true) { account.favorites = active ? [...new Set([...account.favorites, productId])] : account.favorites.filter((id) => id !== productId); return [...account.favorites]; }
export function saveMix(account, input = {}) { const mix = { id: `mix_${randomUUID()}`, name: clean(input.name, 60) || "My Mood", selections: structuredClone(input.selections || {}), createdAt: new Date().toISOString() }; account.mixes.unshift(mix); return mix; }
export function removeMix(account, id) { const before = account.mixes.length; account.mixes = account.mixes.filter((row) => row.id !== id); return before !== account.mixes.length; }
export function saveAddress(account, input = {}) { const address = { id: `addr_${randomUUID()}`, label: clean(input.label, 40) || "Saved address", street: clean(input.street, 100), city: clean(input.city, 80), state: clean(input.state, 30), postalCode: clean(input.postalCode, 20) }; account.addresses.push(address); return address; }
export function removeAddress(account, id) { const before = account.addresses.length; account.addresses = account.addresses.filter((row) => row.id !== id); return before !== account.addresses.length; }
export function requestStudentVerification(account, input = {}) { const schoolEmail = clean(input.schoolEmail).toLowerCase(); if (!validEmail(schoolEmail)) fail("Enter a valid school email.", "student_email_invalid", 422, "schoolEmail"); account.student = { status: "pending_manual_review", schoolEmail, institution: clean(input.institution, 120), submittedAt: new Date().toISOString(), discountActive: false }; return account.student; }
export function updateBusiness(account, input = {}) { const company = clean(input.company, 120); const previousStatus = account.business?.status; account.business = { ...account.business, company, role: clean(input.role, 80), recurringCadence: clean(input.recurringCadence, 40), status: previousStatus === "approved" ? "approved" : company ? "pending_review" : "not_submitted" }; return account.business; }
export function saveEvent(account, input = {}) { const event = { id: `evt_${randomUUID()}`, name: clean(input.name, 100), date: clean(input.date, 10), guests: Math.max(0, Number(input.guests || 0)), status: "draft_requires_quote" }; account.events.push(event); return event; }
export function removeEvent(account, id) { const before = account.events.length; account.events = account.events.filter((row) => row.id !== id); return before !== account.events.length; }
export function enrollRewards(account, consent) { if (!benefitsConfig.loyalty.enabled) fail("Rewards are not active yet.", "rewards_inactive", 409); if (consent !== true) fail("Rewards consent is required.", "rewards_consent_required", 422); account.rewards.enrolled = true; account.rewards.consentAt = new Date().toISOString(); return account.rewards; }
export function attachOrder(account, order) { if (!account || !order) return; account.orderIds = [...new Set([order.id, ...account.orderIds])]; }
export function creditCompletedOrder(order) { const account = order?.accountId ? accounts.get(order.accountId) : null; return account ? creditOrderRewards(account, order) : { credited: false, reason: "account_not_found" }; }
export function reverseCompletedOrderRewards(order, reason = "Order refund or reversal") { const account = order?.accountId ? accounts.get(order.accountId) : null; return account ? reverseOrderRewards(account, order, reason) : { reversed: false, reason: "account_not_found" }; }
export function exportAccount(account, orders) { return { exportedAt: new Date().toISOString(), account: publicAccount(account), ...accountCollections(account), orders }; }
export function deleteAccount(account, password) { authenticate(account.email, password); accounts.delete(account.id); byEmail.delete(account.email); for (const [token, session] of sessions) if (session.accountId === account.id) sessions.delete(token); }

export function adminFindAccount(accountId) {
  return accounts.get(String(accountId || "")) || null;
}

export function adminAccountsSnapshot() {
  return [...accounts.values()].map((account) => ({
    ...publicAccount(account),
    favoritesCount: account.favorites.length,
    mixesCount: account.mixes.length,
    reservationsCount: (account.reservations || []).length,
    ordersCount: account.orderIds.length
  }));
}

export function adminReviewStudent(accountId, { status, expiresAt = "", reviewerReference = "" } = {}) {
  const account = adminFindAccount(accountId);
  if (!account) fail("Account not found.", "account_not_found", 404);
  if (account.type !== "student") fail("Account is not a student account.", "student_account_required", 422);
  if (!["verified", "declined", "expired", "pending_manual_review"].includes(status)) fail("Invalid student review status.", "student_status_invalid", 422);
  account.student = {
    ...account.student,
    status,
    expiresAt: clean(expiresAt, 30),
    reviewedAt: new Date().toISOString(),
    reviewerReference: clean(reviewerReference, 120),
    discountActive: status === "verified"
  };
  return structuredClone(account.student);
}

export function adminReviewBusiness(accountId, { status, reviewerReference = "" } = {}) {
  const account = adminFindAccount(accountId);
  if (!account) fail("Account not found.", "account_not_found", 404);
  if (account.type !== "business") fail("Account is not a business account.", "business_account_required", 422);
  if (!["approved", "declined", "pending_review"].includes(status)) fail("Invalid business review status.", "business_status_invalid", 422);
  account.business = {
    ...account.business,
    status,
    reviewedAt: new Date().toISOString(),
    reviewerReference: clean(reviewerReference, 120)
  };
  return structuredClone(account.business);
}
