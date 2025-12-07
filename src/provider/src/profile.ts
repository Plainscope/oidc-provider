import { Account, AccountClaims, ClaimsParameterMember, KoaContextWithOIDC } from 'oidc-provider';
import { Users } from './users';
import { User } from './user';

// In-memory account storage
export class Profile implements Account {
  accountId: string;
  user: User;
  [key: string]: any;

  constructor(id: string, user: User) {
    this.accountId = id;
    this.user = user;
  }

  async claims(use: string, scope: string, claims: { [key: string]: null | ClaimsParameterMember }): Promise<AccountClaims> {
    console.log('Account.claims called:', { use, scope, claims });

    // scope is a Set or array-like object
    const scopeSet = new Set(scope.split ? scope.split(' ') : scope);
    console.log('Scope set:', Array.from(scopeSet));

    const result: AccountClaims = {
      sub: this.accountId
    };
    // Start with existing claims if provided
    Object.assign(result, claims);

    // Add email claims for both id_token and userinfo
    if (scopeSet.has('email')) {
      result.email = this.user.email;
      result.email_verified = this.user.email_verified;
      console.log('Added email claims:', result.email);
    }

    // Add profile claims for both id_token and userinfo
    if (scopeSet.has('profile')) {
      result.name = this.user.name;
      result.nickname = this.user.nickname;
      result.given_name = this.user.given_name;
      result.family_name = this.user.family_name;
      result.groups = this.user.groups;
      if (this.user.picture) {
        result.picture = this.user.picture;
      }
      console.log('Added profile claims');
    }

    console.log('Final claims for', use, ':', Object.keys(result));
    return result;
  }

  static async find(_ctx: KoaContextWithOIDC, id: string) {
    const user = Users.find(u => u.id === id);
    if (!user) return undefined;
    return new Profile(id, user);
  }

  static async authenticate(email: string, password: string) {
    const user = Users.find(u => u.email === email && u.password === password);
    if (!user) return undefined;
    return new Profile(user.id, user);
  }
}
