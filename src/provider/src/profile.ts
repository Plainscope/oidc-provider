/**
 * Profile class implements OIDC Account interface for user authentication and claims.
 * Handles account lookup, authentication, and claims resolution for OIDC flows.
 */
import { Account, AccountClaims, ClaimsParameterMember, KoaContextWithOIDC } from 'oidc-provider';
import { Users } from './users';
import { User } from './user';

// In-memory account storage and OIDC account logic
export class Profile implements Account {
  accountId: string;
  user: User;
  [key: string]: any;

  constructor(id: string, user: User) {
    this.accountId = id;
    this.user = user;
    console.log(`[PROFILE] Created profile for user: ${user.email}, id: ${id}`);
  }

  /**
   * Returns OIDC claims for the account based on requested scopes and claims.
   */
  async claims(use: string, scope: string, claims: { [key: string]: null | ClaimsParameterMember }): Promise<AccountClaims> {
    console.log('[PROFILE] Account.claims called:', { use, scope, claims });

    // Parse scope string into a Set
    const scopeSet = new Set(scope.split ? scope.split(' ') : scope);
    console.log('[PROFILE] Scope set:', Array.from(scopeSet));

    const result: AccountClaims = {
      sub: this.accountId
    };
    // Merge provided claims
    Object.assign(result, claims);

    // Add email claims if requested
    if (scopeSet.has('email')) {
      result.email = this.user.email;
      result.email_verified = this.user.email_verified;
      console.log('[PROFILE] Added email claims:', result.email);
    }

    // Add profile claims if requested
    if (scopeSet.has('profile')) {
      result.name = this.user.name;
      result.nickname = this.user.nickname;
      result.given_name = this.user.given_name;
      result.family_name = this.user.family_name;
      result.groups = this.user.groups;
      if (this.user.picture) {
        result.picture = this.user.picture;
      }
      console.log('[PROFILE] Added profile claims');
    }

    console.log('[PROFILE] Final claims for', use, ':', Object.keys(result));
    return result;
  }

  /**
   * Finds an account by ID for OIDC Provider.
   */
  static async find(_ctx: KoaContextWithOIDC, id: string) {
    console.log(`[PROFILE] Looking up user by id: ${id}`);
    const user = Users.find(u => u.id === id);
    if (!user) {
      console.warn(`[PROFILE] No user found for id: ${id}`);
      return undefined;
    }
    return new Profile(id, user);
  }

  /**
   * Authenticates a user by email and password.
   */
  static async authenticate(email: string, password: string) {
    console.log(`[PROFILE] Authenticating user: ${email}`);
    const user = Users.find(u => u.email === email && u.password === password);
    if (!user) {
      console.warn(`[PROFILE] Authentication failed for email: ${email}`);
      return undefined;
    }
    console.log(`[PROFILE] Authentication successful for email: ${email}`);
    return new Profile(user.id, user);
  }
}
