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
    const response = await fetch(`${this.baseUrl}/${this.findEndpoint}/${id}`, { headers: this.headers });

    if (!response.ok) {
      console.error(`[RemoteDirectory] User not found: ${id}`);
      return undefined;
    }

    console.log(`[RemoteDirectory] User found: ${id}`);
    var user = await response.json() as User;
    return new Profile(user.id, user);
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
    var user = await response.json() as User;
    return new Profile(user.id, user);
  }
}
