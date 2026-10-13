// Path separators, Windows-reserved characters and control characters.
// \x5c is a backslash (written as an escape so tooling can't collapse it).
const UNSAFE_CHARS = /[/\x5c:*?"<>|\u0000-\u001f]/g;

/**
 * Normalizes a CE number for use both as the DB unique key and as a filesystem
 * directory name, so the two can never disagree about what a CE number is.
 * Trailing dots/spaces are dropped too: Windows silently strips them from
 * folder names, and a name made only of dots ("..") would point at a parent
 * folder — deleting that job would delete every job's media.
 */
export function normalizeCeNumber(raw: string): string {
  return raw.replace(UNSAFE_CHARS, '').trim().replace(/[. ]+$/, '').toUpperCase();
}

export function isValidCeNumber(raw: string): boolean {
  const normalized = normalizeCeNumber(raw);
  return normalized.length > 0 && normalized.length <= 64;
}

/** Throws the message the UI shows when a CE number can't be used. */
export function assertValidCeNumber(raw: string): string {
  if (!isValidCeNumber(raw)) {
    throw new Error('Enter a valid CE number (letters, numbers and dashes; up to 64 characters).');
  }
  return normalizeCeNumber(raw);
}

/**
 * Storage-level guard for CE numbers already saved in the database. Looser
 * than isValidCeNumber so jobs created under older rules keep working, but
 * still never lets a name escape the jobs folder.
 */
export function isSafeFolderName(name: string): boolean {
  return name.length > 0 && !/^[. ]*$/.test(name) && !/[/\\\u0000-\u001f]/.test(name);
}
