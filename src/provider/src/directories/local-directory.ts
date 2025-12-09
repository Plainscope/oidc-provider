/*
 * Loads user data for OIDC Provider from environment or users.json file.
 */
import { User } from "./user";
import { IDirectory } from "./directory";
import { Account } from "oidc-provider";
import { Profile } from "./profile";

/*
 * LocalDirectory implements IDirectory using in-memory user data
 */
export class LocalDirectory implements IDirectory {
  users: User[];

  constructor(json: string) {
    console.log(`[USERS] Loading users from JSON string.`);
    if (!json) {
      throw new Error('User directory JSON is empty or undefined. Provide DIRECTORY_USERS or DIRECTORY_USERS_FILE.');
    }

    try {
      this.users = JSON.parse(json);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new Error(`Failed to parse user directory JSON: ${reason}`);
    }
    console.log(`[USERS] Loaded ${this.users.length} users.`);
  }

  /*
   * Returns the total number of users.
   */
  async count(): Promise<number> {
    return this.users.length;
  }

  /*
   * Finds a user by ID.
   */
  async find(id: string): Promise<Account | undefined> {
    console.log(`[DIRECTORY] Finding user by id: ${id}`);
    var user = this.users.find(user => user.id === id);
    if (!user) {
      console.warn(`[DIRECTORY] User not found: ${id}`);
      return undefined;
    }
    return new Profile(user.id, user);
  }

  /*
   * Validates user credentials.
   */
  async validate(email: string, password: string): Promise<Profile | undefined> {
    console.log(`[DIRECTORY] Validating user: ${email}`);
    const user = this.users.find(user => user.email === email && user.password === password);
    if (!user) {
      console.warn(`[DIRECTORY] Invalid credentials for: ${email}`);
      return undefined;
    }

    console.log(`[DIRECTORY] User validated: ${email}`);
    return new Profile(user.id, user);
  }
}