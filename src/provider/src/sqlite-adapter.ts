import { Adapter, AdapterPayload } from "oidc-provider";
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database connection
 */
function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/oidc.db');
  const dbDir = path.dirname(dbPath);

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS oidc_models (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      payload TEXT NOT NULL,
      expires_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_model_name ON oidc_models(model_name);
    CREATE INDEX IF NOT EXISTS idx_expires_at ON oidc_models(expires_at);
  `);

  console.log(`[SqliteAdapter] Database initialized at: ${dbPath}`);
  return db;
}

export class SqliteAdapter implements Adapter {
  private modelName: string;

  /**
   *
   * Creates an instance of SqliteAdapter for an oidc-provider model.
   *
   * @constructor
   * @param {string} name Name of the oidc-provider model. One of "Grant, "Session", "AccessToken",
   * "AuthorizationCode", "RefreshToken", "ClientCredentials", "Client", "InitialAccessToken",
   * "RegistrationAccessToken", "DeviceCode", "Interaction", "ReplayDetection",
   * "BackchannelAuthenticationRequest", or "PushedAuthorizationRequest"
   *
   */
  constructor(name: string) {
    this.modelName = name;
    initializeDatabase();
    console.log(`[SqliteAdapter] Initialized for model: ${name}`);
  }

  /**
   *
   * Update or Create an instance of an oidc-provider model.
   *
   * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param {string} id Identifier that oidc-provider will use to reference this model instance for
   * future operations.
   * @param {object} payload Object with all properties intended for storage.
   * @param {integer} expiresIn Number of seconds intended for this model to be stored.
   *
   */
  upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();
        const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;
        const payloadStr = JSON.stringify(payload);

        // Check if record exists
        const existing = database.prepare(
          'SELECT id FROM oidc_models WHERE id = ?'
        ).get(id);

        if (existing) {
          // Update existing record
          database.prepare(
            `UPDATE oidc_models 
             SET payload = ?, expires_at = ?, updated_at = unixepoch() 
             WHERE id = ?`
          ).run(payloadStr, expiresAt, id);
        } else {
          // Insert new record
          database.prepare(
            `INSERT INTO oidc_models (id, model_name, payload, expires_at) 
             VALUES (?, ?, ?, ?)`
          ).run(id, this.modelName, payloadStr, expiresAt);
        }

        console.log(`[SqliteAdapter:${this.modelName}] Upserted: ${id}`);
        resolve();
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] Upsert error:`, error);
        reject(error);
      }
    });
  }


  /**
   *
   * Return previously stored instance of an oidc-provider model.
   *
   * @return {Promise} Promise fulfilled with what was previously stored for the id (when found and
   * not dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param {string} id Identifier of oidc-provider model
   *
   */
  find(id: string): Promise<AdapterPayload | undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();
        const now = Math.floor(Date.now() / 1000);

        const row = database.prepare(
          `SELECT payload, expires_at FROM oidc_models 
           WHERE id = ? AND (expires_at IS NULL OR expires_at > ?)`
        ).get(id, now) as { payload: string; expires_at: number | null } | undefined;

        if (!row) {
          resolve(undefined);
          return;
        }

        const payload = JSON.parse(row.payload);
        resolve(payload);
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] Find error:`, error);
        reject(error);
      }
    });
  }

  /**
   *
   * Return previously stored instance of DeviceCode by the end-user entered user code. You only
   * need this method for the deviceFlow feature
   *
   * @return {Promise} Promise fulfilled with the stored device code object (when found and not
   * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param {string} userCode the user_code value associated with a DeviceCode instance
   *
   */
  findByUserCode(userCode: string): Promise<AdapterPayload | undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();
        const now = Math.floor(Date.now() / 1000);

        const rows = database.prepare(
          `SELECT payload, expires_at FROM oidc_models 
           WHERE model_name = 'DeviceCode' AND (expires_at IS NULL OR expires_at > ?)`
        ).all(now) as { payload: string; expires_at: number | null }[];

        // Find the device code with matching userCode
        for (const row of rows) {
          const payload = JSON.parse(row.payload);
          if (payload.userCode === userCode) {
            resolve(payload);
            return;
          }
        }

        resolve(undefined);
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] FindByUserCode error:`, error);
        reject(error);
      }
    });
  }

  /**
   *
   * Return previously stored instance of Session by its uid reference property.
   *
   * @return {Promise} Promise fulfilled with the stored session object (when found and not
   * dropped yet due to expiration) or falsy value when not found anymore. Rejected with error
   * when encountered.
   * @param {string} uid the uid value associated with a Session instance
   *
   */
  findByUid(uid: string): Promise<AdapterPayload | undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();
        const now = Math.floor(Date.now() / 1000);

        const rows = database.prepare(
          `SELECT payload, expires_at FROM oidc_models 
           WHERE model_name = 'Session' AND (expires_at IS NULL OR expires_at > ?)`
        ).all(now) as { payload: string; expires_at: number | null }[];

        // Find the session with matching uid
        for (const row of rows) {
          const payload = JSON.parse(row.payload);
          if (payload.uid === uid) {
            resolve(payload);
            return;
          }
        }

        resolve(undefined);
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] FindByUid error:`, error);
        reject(error);
      }
    });
  }

  /**
   *
   * Mark a stored oidc-provider model as consumed (not yet expired though!). Future finds for this
   * id should be fulfilled with an object containing additional property named "consumed" with a
   * truthy value (timestamp, date, boolean, etc).
   *
   * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param {string} id Identifier of oidc-provider model
   *
   */
  consume(id: string): Promise<undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();

        database.prepare(
          `UPDATE oidc_models 
           SET payload = json_set(payload, '$.consumed', unixepoch()),
               updated_at = unixepoch()
           WHERE id = ?`
        ).run(id);

        console.log(`[SqliteAdapter:${this.modelName}] Consumed: ${id}`);
        resolve();
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] Consume error:`, error);
        reject(error);
      }
    });
  }

  /**
   *
   * Destroy/Drop/Remove a stored oidc-provider model. Future finds for this id should be fulfilled
   * with falsy values.
   *
   * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param {string} id Identifier of oidc-provider model
   *
   */
  destroy(id: string): Promise<undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();

        database.prepare(
          'DELETE FROM oidc_models WHERE id = ?'
        ).run(id);

        console.log(`[SqliteAdapter:${this.modelName}] Destroyed: ${id}`);
        resolve();
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] Destroy error:`, error);
        reject(error);
      }
    });
  }

  /**
   *
   * Destroy/Drop/Remove a stored oidc-provider model by its grantId property reference. Future
   * finds for all tokens having this grantId value should be fulfilled with falsy values.
   *
   * @return {Promise} Promise fulfilled when the operation succeeded. Rejected with error when
   * encountered.
   * @param {string} grantId the grantId value associated with a this model's instance
   *
   */
  revokeByGrantId(grantId: string): Promise<undefined | void> {
    return new Promise((resolve, reject) => {
      try {
        const database = initializeDatabase();
        const now = Math.floor(Date.now() / 1000);

        const rows = database.prepare(
          `SELECT id, payload FROM oidc_models 
           WHERE model_name != 'Client' AND (expires_at IS NULL OR expires_at > ?)`
        ).all(now) as { id: string; payload: string }[];

        // Find all records with matching grantId and delete them
        let deletedCount = 0;
        for (const row of rows) {
          try {
            const payload = JSON.parse(row.payload);
            if (payload.grantId === grantId) {
              database.prepare('DELETE FROM oidc_models WHERE id = ?').run(row.id);
              deletedCount++;
            }
          } catch {
            // Skip records that can't be parsed
          }
        }

        console.log(`[SqliteAdapter:${this.modelName}] Revoked ${deletedCount} tokens for grantId: ${grantId}`);
        resolve();
      } catch (error) {
        console.error(`[SqliteAdapter:${this.modelName}] RevokeByGrantId error:`, error);
        reject(error);
      }
    });
  }
}

/**
 *
 * Factory function to create SqliteAdapter instances for oidc-provider models.
 *
 * @return {SqliteAdapter} Instance of SqliteAdapter for the specified model name.
 * @param {string} name Name of the oidc-provider model.
 *
 */
export default (name: string): SqliteAdapter => {
  return new SqliteAdapter(name);
};