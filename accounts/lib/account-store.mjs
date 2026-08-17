import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

export const accountConfig = {
  meta: { mode: "safe_test", storage: "memory_only_test" },
  accountTypes: ["regular", "student", "business"],
  rewards: { status: "working_pending_owner_approval", pointsPerDollar: 10, pointsPerDollarReward: 100 },
  studentVerification: { mode: "manual_review_test", methods: ["school_email"], affiliationDisclaimer: "No university sponsorship or affiliation is implied." },
  privacy: { persistence: "Server memory resets on restart", exportAvailable: true, deletionAvailable: true },
  authentication: { cookieName: "stj_test_session", sessionHours: 8, passwordMinimumCharacters: 10, emailVerification: "not_configured" }
};

const accounts = new Map(), byEmail = new Map(), sessions = new Map(), attempts = new Map();
const clean = (v, n = 200) => String(v || "").trim().slice(0, n);
const fail = (message, code, status = 400, field) => { throw Object.assign(new Error(message), { code, status, field }); };
const hashPassword = (password, salt = randomBytes(16).toString("hex")) => ({ salt, hash: scryptSync(password, salt, 64).toString("hex") });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function parseCookies(header = "") { return Object.fromEntries(String(header).split(";").map((part) => part.trim().split("=")).filter(([key]) => key)); }
export function authRateLimit(key) { const now = Date.now(), row = attempts.get(key) || { count: 0, reset: now + 300000 }; if (row.reset < now) Object.assign(row, { count: 0, reset: now + 300000 }); if (++row.count > 10) fail("Too many sign-in attempts. Try again later.", "rate_limited", 429); attempts.set(key, row); }
export function clearAuthAttempts(key) { attempts.delete(key); }

export function registerAccount(input = {}) {
  const email = clean(input.email).toLowerCase(), name = clean(input.name, 100), password = String(input.password || ""), type = accountConfig.accountTypes.includes(input.type) ? input.type : "regular";
  if (!validEmail(email)) fail("Enter a valid email.", "email_invalid", 422, "email");
  if (name.length < 2) fail("Enter your name.", "name_required", 422, "name");
  if (password.length < accountConfig.authentication.passwordMinimumCharacters) fail("Password is too short.", "password_short", 422, "password");
  if (byEmail.has(email)) fail("An account already exists for this email.", "email_exists", 409, "email");
  const account = { id: `acct_${randomUUID()}`, email, name, phone: clean(input.phone, 40), type, birthday: clean(input.birthday, 10), password: hashPassword(password), createdAt: new Date().toISOString(), favorites: [], mixes: [], addresses: [], events: [], orderIds: [], rewards: { enrolled: false, points: 0, consentAt: null }, student: { status: "not_submitted" }, business: {} };
  accounts.set(account.id, account); byEmail.set(email, account.id); return account;
}

export function authenticate(emailInput, passwordInput) { const email = clean(emailInput).toLowerCase(), account = accounts.get(byEmail.get(email)); if (!account) fail("Email or password is incorrect.", "credentials_invalid", 401); const check = hashPassword(String(passwordInput || ""), account.password.salt); if (!timingSafeEqual(Buffer.from(check.hash, "hex"), Buffer.from(account.password.hash, "hex"))) fail("Email or password is incorrect.", "credentials_invalid", 401); return account; }
export function createSession(accountId) { const token = randomBytes(32).toString("base64url"), session = { token, accountId, csrfToken: randomBytes(24).toString("base64url"), expiresAt: Date.now() + accountConfig.authentication.sessionHours * 3600000 }; sessions.set(token, session); return session; }
export function destroySession(token) { sessions.delete(token); }
export function sessionForRequest(request) { const token = parseCookies(request.headers.cookie || "")[accountConfig.authentication.cookieName], session = sessions.get(token); if (!session || session.expiresAt <= Date.now()) { if (token) sessions.delete(token); return null; } const account = accounts.get(session.accountId); return account ? { session, account } : null; }
export function requireAccount(request, { csrf = false } = {}) { const resolved = sessionForRequest(request); if (!resolved) fail("Sign in is required.", "authentication_required", 401); if (csrf && request.headers["x-csrf-token"] !== resolved.session.csrfToken) fail("The account request could not be verified.", "csrf_invalid", 403); return resolved; }
export function publicAccount(account) { return { id: account.id, email: account.email, name: account.name, phone: account.phone, type: account.type, birthday: account.birthday, createdAt: account.createdAt, rewards: account.rewards, student: account.student, business: account.business }; }
export function accountCollections(account) { return { favorites: [...account.favorites], mixes: structuredClone(account.mixes), addresses: structuredClone(account.addresses), events: structuredClone(account.events) }; }
export function updateProfile(account, input = {}) { if (input.name != null) account.name = clean(input.name, 100); if (input.phone != null) account.phone = clean(input.phone, 40); if (input.birthday != null) account.birthday = clean(input.birthday, 10); return account; }
export function setFavorite(account, productId, active = true) { account.favorites = active ? [...new Set([...account.favorites, productId])] : account.favorites.filter((id) => id !== productId); return [...account.favorites]; }
export function saveMix(account, input = {}) { const mix = { id: `mix_${randomUUID()}`, name: clean(input.name, 60) || "My Mood", selections: structuredClone(input.selections || {}), createdAt: new Date().toISOString() }; account.mixes.unshift(mix); return mix; }
export function removeMix(account, id) { const before = account.mixes.length; account.mixes = account.mixes.filter((row) => row.id !== id); return before !== account.mixes.length; }
export function saveAddress(account, input = {}) { const address = { id: `addr_${randomUUID()}`, label: clean(input.label, 40) || "Saved address", street: clean(input.street, 100), city: clean(input.city, 80), state: clean(input.state, 30), postalCode: clean(input.postalCode, 20) }; account.addresses.push(address); return address; }
export function removeAddress(account, id) { const before = account.addresses.length; account.addresses = account.addresses.filter((row) => row.id !== id); return before !== account.addresses.length; }
export function requestStudentVerification(account, input = {}) { account.student = { status: "pending_manual_review", schoolEmail: clean(input.schoolEmail).toLowerCase(), institution: clean(input.institution, 120), submittedAt: new Date().toISOString(), discountActive: false }; return account.student; }
export function updateBusiness(account, input = {}) { account.business = { ...account.business, company: clean(input.company, 120), role: clean(input.role, 80), recurringCadence: clean(input.recurringCadence, 40) }; return account.business; }
export function saveEvent(account, input = {}) { const event = { id: `evt_${randomUUID()}`, name: clean(input.name, 100), date: clean(input.date, 10), guests: Math.max(0, Number(input.guests || 0)), status: "draft_requires_quote" }; account.events.push(event); return event; }
export function removeEvent(account, id) { const before = account.events.length; account.events = account.events.filter((row) => row.id !== id); return before !== account.events.length; }
export function enrollRewards(account, consent) { if (consent !== true) fail("Rewards consent is required.", "rewards_consent_required", 422); account.rewards.enrolled = true; account.rewards.consentAt = new Date().toISOString(); return account.rewards; }
export function attachOrder(account, order) { if (!account || !order) return; account.orderIds = [...new Set([order.id, ...account.orderIds])]; if (account.rewards.enrolled) account.rewards.points += Math.floor(Number(order.totals.total.amount || 0) * accountConfig.rewards.pointsPerDollar); }
export function exportAccount(account, orders) { return { exportedAt: new Date().toISOString(), account: publicAccount(account), ...accountCollections(account), orders }; }
export function deleteAccount(account, password) { authenticate(account.email, password); accounts.delete(account.id); byEmail.delete(account.email); for (const [token, session] of sessions) if (session.accountId === account.id) sessions.delete(token); }
