/**
 * Keeps this browser's cached workspace data (decks, chats, names, photos,
 * creation handoffs) from leaking between accounts.
 *
 * Those caches live in localStorage/sessionStorage under keys that are not
 * all scoped to a user, so the next account signed in on the same browser
 * used to see the previous account's last deck and chat. Firestore is the
 * source of truth for all of it, so dropping the cache costs only a reload.
 */
// A new key on purpose: browsers that already hold another account's cache
// have no owner recorded under it, so they are cleaned once on next sign-in.
const LAST_UID_KEY = "webinarstack_cache_owner";

// Every per-user cache key starts with one of these. Public, account-free
// caches (e.g. webinarstack_home_settings_cache) are deliberately left alone.
const USER_PREFIXES = ["astrocraft", "webinarkit"];

function clearStore(store: Storage) {
  const doomed: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (key && USER_PREFIXES.some((prefix) => key.startsWith(prefix))) doomed.push(key);
  }
  for (const key of doomed) store.removeItem(key);
}

/** Drops every cached workspace item in this browser. */
export function clearLocalUserData() {
  if (typeof window === "undefined") return;
  try {
    clearStore(localStorage);
    clearStore(sessionStorage);
    localStorage.removeItem(LAST_UID_KEY);
  } catch {
    // Storage blocked (private mode etc.): nothing cached to leak either.
  }
}

/**
 * Call as soon as the signed-in user is known, before rendering their data.
 * If the cache belongs to someone else, or to nobody we can identify, it is
 * cleared first; then the cache is marked as belonging to `uid`.
 */
export function claimLocalData(uid: string) {
  if (typeof window === "undefined" || !uid) return;
  try {
    if (localStorage.getItem(LAST_UID_KEY) !== uid) clearLocalUserData();
    localStorage.setItem(LAST_UID_KEY, uid);
  } catch {
    // See clearLocalUserData.
  }
}

/** The account the browser cache currently belongs to, if any. */
export function localDataOwner(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LAST_UID_KEY) ?? "";
  } catch {
    return "";
  }
}
