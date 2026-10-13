/**
 * Client ID of the "BPD Capture Sync" GitHub App (github.com/settings/apps).
 * Not a secret: the device-flow sign-in needs only this, and it identifies
 * the app, not the user. Empty until the App is created; sign-in stays
 * disabled until then.
 */
export const GITHUB_APP_CLIENT_ID = '';

/** How often to check GitHub while the app is open (ETag requests that find nothing don't count against GitHub's rate limit). */
export const SYNC_INTERVAL_MS = 2 * 60 * 1000;

/** Wait this long after a local change before pushing, so a burst of edits becomes one commit. */
export const PUSH_DEBOUNCE_MS = 5000;

/** The desktop is usually open all day on mains power, so it checks a little more often. */
export const SYNC_INTERVAL_DESKTOP_MS = 60 * 1000;
