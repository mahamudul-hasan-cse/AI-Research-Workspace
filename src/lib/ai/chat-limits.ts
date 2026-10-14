/** Shared request budget. Keep provider configuration on the server. */
export const CHAT_LIMITS = {
  maxMessages: 50,
  maxMessageChars: 8000,
  maxParts: 32,
  maxBodyBytes: 256 * 1024,
} as const;
