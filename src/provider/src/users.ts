import { User } from "./user";
import path from "node:path";
import fs from "node:fs";

// File path to the users.json file
const usersFilePath = process.env.USERS_FILE || path.join(__dirname, 'users.json');


export const Users: User[] = process.env.USERS ?
  JSON.parse(process.env.USERS) :
  JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));