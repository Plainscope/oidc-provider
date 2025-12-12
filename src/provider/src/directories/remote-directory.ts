/**
 * Loads user data for OIDC Provider from a remote source.
 * Exports Users array for authentication and claims.
 */
import { User } from "./user";
import { IDirectory } from "./directory";
import { Account } from "oidc-provider";
import { Profile } from "./profile";

export class RemoteDirectory implements IDirectory {
  private baseUrl: string;
  private headers?: Record<string, string>;
  private countEndpoint?: string;
  private findEndpoint?: string;
  private validateEndpoint?: string;

  constructor(baseUrl: string, headers?: Record<string, string>,
    countEndpoint?: string, findEndpoint?: string, validateEndpoint?: string) {
    this.baseUrl = baseUrl;
    this.headers = headers;
    this.countEndpoint = countEndpoint || '/count';
    this.findEndpoint = findEndpoint || '/find';
    this.validateEndpoint = validateEndpoint || '/validate';
    console.log(`[RemoteDirectory] Initialized with baseUrl: ${baseUrl}`);
    console.log(`[RemoteDirectory] Initialized with headers: ${JSON.stringify(headers)}`);
  }

  /**
   * Maps directory user object to OIDC User interface
   */
  private mapUser(dirUser: any, email?: string): User {
    console.log(`[RemoteDirectory] Mapping user:`, JSON.stringify(dirUser, null, 2));
    return {
      id: dirUser.id,
      email: dirUser.emails?.[0]?.email || dirUser.email || email || '',
      password: dirUser.password || '',
      email_verified: dirUser.properties?.email_verified || dirUser.email_verified || false,
      name: dirUser.display_name || dirUser.name || `${dirUser.first_name || ''} ${dirUser.last_name || ''}`.trim(),
      given_name: dirUser.first_name || dirUser.given_name,
      family_name: dirUser.last_name || dirUser.family_name,
      middle_name: dirUser.properties?.middle_name || dirUser.middle_name,
      nickname: dirUser.properties?.nickname || dirUser.nickname,
      picture: dirUser.properties?.picture || dirUser.picture,
      profile: dirUser.properties?.profile || dirUser.profile,
      website: dirUser.properties?.website || dirUser.website,
      gender: dirUser.properties?.gender || dirUser.gender,
      birthdate: dirUser.properties?.birthdate || dirUser.birthdate,
      zoneinfo: dirUser.properties?.zoneinfo || dirUser.zoneinfo,
      locale: dirUser.properties?.locale || dirUser.locale,
      phone_number: dirUser.properties?.phone_number || dirUser.phone_number,
      phone_number_verified: dirUser.properties?.phone_number_verified || dirUser.phone_number_verified || false,
      address: dirUser.properties?.address || dirUser.address,
      updated_at: dirUser.properties?.updated_at || dirUser.updated_at,
      groups: dirUser.groups?.map((g: any) => g.name) || [],
      roles: dirUser.roles?.map((r: any) => r.name) || [],
    };
  }

  /*
   * Returns the total number of users.
   */
  async count(): Promise<number> {
    console.log(`[RemoteDirectory] Fetching user count from: ${this.baseUrl}/${this.countEndpoint}`);
    const response = await fetch(`${this.baseUrl}/${this.countEndpoint}`, { headers: this.headers });

    if (!response.ok) {
      console.error(`[RemoteDirectory] Failed to fetch user count: ${response.status} ${response.statusText}`);
      return 0;
    }

    var count = await response.json() as number;
    console.log(`[RemoteDirectory] Fetched user count ${count} successfully`);
    return count;
  }

  /*
   * Finds a user by ID.
   */
  async find(id: string): Promise<Account | undefined> {
    console.log(`[RemoteDirectory] Finding user by id: ${id}`);
    let response = await fetch(`${this.baseUrl}/${this.findEndpoint}/${id}`, { headers: this.headers });

    // Fallback: if lookup by id fails and id looks like an email, try finding by email
    if (!response.ok && id.includes('@')) {
      console.warn(`[RemoteDirectory] User not found by id, retrying by email: ${id}`);
      response = await fetch(`${this.baseUrl}/${this.findEndpoint}/${encodeURIComponent(id)}`, { headers: this.headers });
    }

    if (!response.ok) {
      console.error(`[RemoteDirectory] User not found after fallback: ${id}`);
      // Signal upstream to trigger a re-login flow
      throw new Error('ACCOUNT_NOT_FOUND');
    }

    console.log(`[RemoteDirectory] User found: ${id}`);
    const dirUser = await response.json();
    const user = this.mapUser(dirUser);
    return new Profile(user.id || user.email, user);
  }


  /*
   * Validates user credentials.
   */
  async validate(email: string, password: string): Promise<Account | undefined> {
    const response = await fetch(`${this.baseUrl}/${this.validateEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      console.error(`[RemoteDirectory] Invalid credentials for: ${email}`);
      return undefined;
    }

    console.log(`[RemoteDirectory] User validated: ${email}`);
    const data = await response.json() as any;

    // Directory API returns { user: {...}, valid: true }
    // Extract the user object from the response
    const dirUser = data.user || data;
    const user = this.mapUser(dirUser, email);

    // Use stable accountId based on email to tolerate id churn
    const accountId = user.email || user.id;
    return new Profile(accountId, user);
  }
}