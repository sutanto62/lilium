/**
 * Utility functions for masking sensitive data
 */

/**
 * Masks a UUID, showing only the last 6 characters
 * @param uuid The UUID to mask
 * @returns Masked UUID with only last 6 characters visible, or empty string if input is invalid
 * @example
 * maskUuid('550e8400-e29b-41d4-a716-446655440000') // returns '********-****-****-****-446655440000'
 * maskUuid(null) // returns ''
 */
export function maskUuid(uuid: string | null | undefined): string {
  if (!uuid) return '';
  
  return uuid.replace(
    /([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{8})([0-9a-f]{4})/i,
    '********-****-****-****-********$4'
  );
}

/**
 * Masks an email address, showing only the first 3 characters and the domain
 * @param email The email address to mask
 * @returns Masked email address, or empty string if input is invalid
 * @example
 * maskEmail('john.doe@example.com') // returns 'joh***@example.com'
 * maskEmail(null) // returns ''
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email; // Return original if not a valid email
  
  const visibleChars = Math.min(3, localPart.length);
  const maskedLocalPart = localPart.slice(0, visibleChars) + '*'.repeat(localPart.length - visibleChars);
  
  return `${maskedLocalPart}@${domain}`;
}

/**
 * Masks a phone number, showing only the last 4 digits
 * @param phone The phone number to mask
 * @returns Masked phone number, or empty string if input is invalid
 * @example
 * maskPhone('+6281234567890') // returns '********7890'
 * maskPhone(null) // returns ''
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone; // Return original if too short
  
  const lastFour = digits.slice(-4);
  return '*'.repeat(digits.length - 4) + lastFour;
}

/**
 * Masks a credit card number, showing only the last 4 digits
 * @param cardNumber The credit card number to mask
 * @returns Masked credit card number, or empty string if input is invalid
 * @example
 * maskCreditCard('1234-5678-9012-3456') // returns '************3456'
 * maskCreditCard(null) // returns ''
 */
export function maskCreditCard(cardNumber: string | null | undefined): string {
  if (!cardNumber) return '';
  
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return cardNumber; // Return original if too short
  
  const lastFour = digits.slice(-4);
  return '*'.repeat(digits.length - 4) + lastFour;
}

/**
 * Masks a string with a custom pattern
 * @param str The string to mask
 * @param visibleChars Number of characters to keep visible at the end
 * @param maskChar Character to use for masking (default: '*')
 * @returns Masked string, or empty string if input is invalid
 * @example
 * maskString('1234567890', 4) // returns '******7890'
 * maskString(null, 4) // returns ''
 */
export function maskString(str: string | null | undefined, visibleChars: number, maskChar: string = '*'): string {
  if (!str) return '';
  if (str.length <= visibleChars) return str;
  
  const visiblePart = str.slice(-visibleChars);
  return maskChar.repeat(str.length - visibleChars) + visiblePart;
} 