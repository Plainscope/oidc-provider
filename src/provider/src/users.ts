/**
 * Loads user data for OIDC Provider from environment or users.json file.
 * Exports Users array for authentication and claims.
 */
import { User } from "./user";
import path from "node:path";
import fs from "node:fs";

// File path to the users.json file
const usersFilePath = process.env.USERS_FILE || path.join(__dirname, 'users.json');
console.log(`[USERS] Loading users from: ${process.env.USERS ? 'environment variable' : usersFilePath}`);

export const Users: User[] = process.env.USERS ?
  JSON.parse(process.env.USERS) :
  JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
console.log(`[USERS] Loaded ${Users.length} users.`);