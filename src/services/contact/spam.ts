/**
 * Spam detection for contact form submissions.
 * Checks: excessive links, suspicious patterns, short/long content.
 */

const MAX_LINKS = 3;
const MAX_REPEAT_CHARS = 15; // e.g. "aaaaaaaaaaaaaaaa" (16+)
const MIN_MESSAGE_LENGTH = 10;

const SPAM_PATTERNS = [
  /\b(buy now|click here|limited time|act now|free money|earn \$|make \$)\b/i,
  /\b(viagra|cialis|casino|lottery|winner|congratulations you won)\b/i,
  /(.)\1{10,}/, // excessive repeated characters
  /https?:\/\/\S+\s+https?:\/\/\S+\s+https?:\/\/\S+\s+https?:\/\/\S+/, // 4+ URLs
];

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
}

export function checkSpam(data: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}): SpamCheckResult {
  const { firstName, lastName, email, message } = data;
  const combined = `${firstName} ${lastName} ${email} ${message}`;

  // 1. Excessive links
  const linkCount = (message.match(/https?:\/\//g) ?? []).length;
  if (linkCount > MAX_LINKS) {
    return { isSpam: true, reason: `Excessive links (${linkCount})` };
  }

  // 2. Spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(combined)) {
      return { isSpam: true, reason: `Spam pattern detected` };
    }
  }

  // 3. Very short message
  if (message.trim().length < MIN_MESSAGE_LENGTH) {
    return { isSpam: true, reason: `Message too short (${message.trim().length} chars)` };
  }

  // 4. Extremely long names (bot behavior)
  if (firstName.length > 100 || lastName.length > 100) {
    return { isSpam: true, reason: "Name field excessively long" };
  }

  // 5. Suspicious email patterns
  if (/^(test|spam|fake|asdf)/i.test(email)) {
    return { isSpam: true, reason: "Suspicious email prefix" };
  }

  return { isSpam: false };
}
