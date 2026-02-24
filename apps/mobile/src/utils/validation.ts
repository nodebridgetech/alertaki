const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{10,15}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim().replace(/[\s\-()]/g, ''));
}

export function isValidEmailOrPhone(input: string): boolean {
  const trimmed = input.trim();
  return isValidEmail(trimmed) || isValidPhone(trimmed);
}
