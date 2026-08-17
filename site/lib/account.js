const KEY = "stjuice-stage07-account";

export const rewardsConfig = {
  status: "working_program_pending_owner_approval",
  pointsPerDollar: 10,
  redemption: "100 points = $1 working reward",
  birthdayReward: "Pending owner approval"
};

const seed = {
  signedIn: false,
  profile: { name: "", email: "", phone: "", birthday: "", mode: "regular" },
  student: { status: "not_submitted", schoolEmail: "", institution: "", expiresAt: "" },
  business: { company: "", contactRole: "", recurringCadence: "", savedEvent: "" },
  points: 240,
  favorites: [],
  savedMixes: [],
  orderHistory: []
};

export function loadAccount() {
  try { return { ...structuredClone(seed), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return structuredClone(seed); }
}

export function saveAccount(account) {
  localStorage.setItem(KEY, JSON.stringify(account));
}

export function accountView(account) {
  const nextReward = Math.ceil(account.points / 100) * 100;
  return { ...account, rewardDollars: Math.floor(account.points / 100), nextReward, pointsToNext: nextReward - account.points };
}

export function toggleFavorite(account, productId) {
  account.favorites = account.favorites.includes(productId)
    ? account.favorites.filter((id) => id !== productId)
    : [...account.favorites, productId];
  saveAccount(account);
}

export function saveMix(account, mix) {
  const entry = { ...mix, id: `mix-${Date.now()}`, savedAt: new Date().toISOString() };
  account.savedMixes = [entry, ...account.savedMixes].slice(0, 12);
  saveAccount(account);
  return entry;
}

export function rememberOrder(account, order) {
  const entry = { id: order.id, orderNumber: order.orderNumber, service: order.service, status: order.status, total: order.totals.total.amount, items: order.items, createdAt: order.createdAt || new Date().toISOString() };
  account.orderHistory = [entry, ...account.orderHistory.filter((item) => item.id !== order.id)].slice(0, 20);
  account.points += Math.floor(Number(order.totals.total.amount || 0) * rewardsConfig.pointsPerDollar);
  saveAccount(account);
}
