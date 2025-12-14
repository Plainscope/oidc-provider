/**
  * Directory Factory
  * Creates directory instances based on configuration
  */
import { Account } from 'oidc-provider';
import { RemoteDirectory } from './remote-directory';
import { LocalDirectory } from './local-directory';
import { SqliteDirectory } from './sqlite-directory';

/**
  * Directory interface for user management
  */
export interface IDirectory {
  count(): Promise<number>;
  find(
    id: string,
  ): Promise<Account | undefined>;
  validate(email: string, password: string): Promise<Account | undefined>;
}

/**
  * Factory function to create directory instances
  */
export default (directoryType: 'local' | 'remote' | 'sqlite', config: any): IDirectory => {
  switch (directoryType) {
    case 'local':
      const { json } = config;
      return new LocalDirectory(json);
    case 'remote':
      const { baseUrl, headers, countEndpoint, findEndpoint, validateEndpoint } = config;
      return new RemoteDirectory(baseUrl, headers, countEndpoint, findEndpoint, validateEndpoint);
    case 'sqlite':
      const { dbPath } = config;
      return new SqliteDirectory(dbPath);
    default:
      throw new Error(`Unknown directory type: ${directoryType}`);
  }
};