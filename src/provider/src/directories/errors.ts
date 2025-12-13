/**
 * Custom error classes for directory operations
 */

/**
 * Error thrown when an account cannot be found in the directory.
 * This is used to signal that a re-login flow should be triggered.
 */
export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`);
    this.name = 'AccountNotFoundError';
    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AccountNotFoundError);
    }
  }
}
