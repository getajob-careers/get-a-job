// Single source of truth for password validation across the app.
//
// Mirrors the project's Supabase auth config (password_min_length=8 plus
// password_required_characters with lowercase / uppercase / digit / symbol
// groups). HIBP is checked server-side only — surfaced as a hint in the UI.
//
// IMPORTANT: the symbol set is matched via a Set lookup rather than a regex
// character class. A previous regex-based version had a subtle bug: the
// `+-=` substring inside the character class was interpreted as a range
// (ASCII 43-61) which silently matched digits 0-9 as "symbols", causing
// the frontend to green-light passwords that the server rejected.
// See: getajob.careers password-change session, 2026-05-14.

export const MIN_LEN = 8;

export const SYMBOL_SET = new Set([
  "!", "@", "#", "$", "%", "^", "&", "*", "(", ")",
  "_", "+", "-", "=", "[", "]", "{", "}", ";", "'",
  "\\", ":", "\"", "|", "<", ">", "?", ",", ".", "/",
  "`", "~",
]);

export function hasSymbol(password) {
  for (const c of password) {
    if (SYMBOL_SET.has(c)) return true;
  }
  return false;
}

export function getPasswordChecks(password) {
  return {
    length: password.length >= MIN_LEN,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: hasSymbol(password),
  };
}

export function allChecksPass(checks) {
  return Object.values(checks).every(Boolean);
}
