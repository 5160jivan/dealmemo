/**
 * Input validation and sanitization for the DealMemo API.
 * Prevents prompt injection, validates input shape.
 */

const MAX_COMPANY_NAME_LENGTH = 100;
const MIN_COMPANY_NAME_LENGTH = 2;

// Patterns that suggest prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /ignore all previous/i,
  /disregard.*instructions/i,
  /you are now/i,
  /act as.*\b(jailbreak|DAN|evil|unrestricted)\b/i,
  /<script/i,
  /javascript:/i,
  /\bsystem prompt\b/i,
  /\bforget.*previous\b/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate and sanitize a company name from user input.
 */
export function validateCompanyName(input: unknown): ValidationResult {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Company name must be a string' };
  }

  const trimmed = input.trim();

  if (trimmed.length < MIN_COMPANY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Company name must be at least ${MIN_COMPANY_NAME_LENGTH} characters`,
    };
  }

  if (trimmed.length > MAX_COMPANY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Company name must be ${MAX_COMPANY_NAME_LENGTH} characters or fewer`,
    };
  }

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid company name — please enter a real company name',
      };
    }
  }

  // Sanitize: strip HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '').trim();

  if (!sanitized) {
    return { valid: false, error: 'Company name cannot be empty after sanitization' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate the full chat request body.
 */
export interface ChatRequestBody {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export function validateChatRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: ChatRequestBody;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.messages)) {
    return { valid: false, error: 'messages must be an array' };
  }

  if (b.messages.length === 0) {
    return { valid: false, error: 'messages array cannot be empty' };
  }

  if (b.messages.length > 50) {
    return { valid: false, error: 'Too many messages in conversation (max 50)' };
  }

  // Validate each message
  for (const msg of b.messages) {
    if (typeof msg !== 'object' || !msg) {
      return { valid: false, error: 'Each message must be an object' };
    }

    const m = msg as Record<string, unknown>;

    if (!['user', 'assistant', 'system'].includes(m.role as string)) {
      return { valid: false, error: `Invalid message role: ${m.role}` };
    }

    if (typeof m.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }

    if (m.content.length > 10_000) {
      return { valid: false, error: 'Message content too long (max 10,000 chars)' };
    }
  }

  return { valid: true, data: b as unknown as ChatRequestBody };
}
