/**
 * OIDC Provider - OAuth 2.0 Authorization Server with OpenID Connect support
 */
import { Provider } from 'oidc-provider';
import { configuration } from './configuration';
import { Profile } from './profile';

const PORT = process.env.PORT || 9000;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;


configuration.findAccount = Profile.find;

const provider = new Provider(ISSUER, configuration);

// Enable proxy if behind a reverse proxy
provider.proxy = process.env.PROXY === 'true';

// Log all incoming requests
provider.use(async (ctx, next) => {
  console.log(`${ctx.method} ${ctx.path}`);
  await next();
});

provider.listen(PORT, () => {
  console.log(`OIDC Provider is listening on port ${PORT}, issuer: ${ISSUER}`);
  console.log(`Configuration loaded from ${process.env.CONFIG ? 'environment variable' : (process.env.CONFIG_FILE || './config.json')}`);
  console.log(`Configured clients: ${configuration.clients?.length || 0}`);
  console.log(`Number of users: ${require('./users').Users.length}`);
  console.log(`Proxy mode is ${provider.proxy ? 'enabled' : 'disabled'}`);
});