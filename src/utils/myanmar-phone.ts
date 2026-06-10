/**
 * Myanmar mobile normalization — mirrors Laravel AuthController::normalizeMyanmarPhone().
 * Output format: +959XXXXXXXX (7–9 digits after +959).
 */

const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

/** Normalize user input to E.164 +959… format. */
export function normalizeMyanmarPhone(phone: string): string {
  const trimmed = phone.trim();
  const cleanPhone = cleanPhoneNumber(trimmed);

  if (cleanPhone.startsWith('09')) {
    return `+95${cleanPhone.substring(1)}`;
  }
  if (cleanPhone.startsWith('9') && !cleanPhone.startsWith('95')) {
    return `+95${cleanPhone}`;
  }
  if (cleanPhone.startsWith('959')) {
    return `+${cleanPhone}`;
  }
  if (cleanPhone.startsWith('95')) {
    return `+95${cleanPhone.substring(2)}`;
  }
  if (trimmed.startsWith('+959')) {
    return trimmed.replace(/[^\d+]/g, '');
  }
  if (trimmed.startsWith('+95')) {
    return `+95${trimmed.substring(3).replace(/\D/g, '')}`;
  }

  return trimmed.startsWith('+') ? trimmed.replace(/[^\d+]/g, '') : `+${cleanPhone}`;
}

/** Validate after normalization (matches AuthController::isValidMyanmarPhone). */
export function isValidMyanmarPhone(phone: string): boolean {
  return /^\+959\d{7,9}$/.test(normalizeMyanmarPhone(phone));
}
