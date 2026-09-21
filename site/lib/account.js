const seed = {
  signedIn: false,
  csrfToken: "",
  profile: { name: "", email: "", phone: "", birthday: "", mode: "regular" },
  student: { status: "not_submitted", schoolEmail: "", institution: "", expiresAt: "" },
  business: { status: "not_submitted", company: "", role: "", recurringCadence: "" },
  points: 0,
  favorites: [],
  savedMixes: [],
  orderHistory: [],
  reservations: [],
  addresses: [],
  cateringRequests: [],
  benefits: null,
  rewardsWallet: { points: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, transactions: [], grants: [] },
  reservationConfig: null,
  rewardsConfig: null
};

export function loadAccount() {
  return structuredClone(seed);
}

export function accountView(account) {
  return account || structuredClone(seed);
}
