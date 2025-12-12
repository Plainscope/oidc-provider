import { Express } from 'express';
import { Provider } from 'oidc-provider';
import assert from 'assert';
import validator from 'validator';
import { IDirectory } from '../directories/directory';

// Production mode flag
const isProduction = process.env.NODE_ENV === 'production';

// Helper function to format objects for debugging (disabled in production)
const debug = (obj: any): string => isProduction ? '' : JSON.stringify(obj, null, 2);

/**
 * Sanitizes input string using validator.js to prevent XSS and injection attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 * @throws Error if input exceeds maximum length
 */
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  const MAX_INPUT_LENGTH = 255;
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`);
  }

  // Use validator.js for proper sanitization
  return validator.escape(validator.trim(input));
};

/**
 * Validates email format using validator.js
 * @param email - The email to validate
 * @returns true if email format is valid
 */
const isValidEmail = (email: string): boolean => {
  const baseValid = validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: isProduction,
  });

  // In non-production, permit localhost-style emails for local testing
  if (!baseValid && !isProduction) {
    return email.toLowerCase().endsWith('@localhost');
  }

  return baseValid;
};

// Configurable timing attack prevention delay (ms)
const MIN_AUTH_RESPONSE_TIME = parseInt(process.env.MIN_AUTH_RESPONSE_TIME || '100', 10);


/**
 * Registers OIDC interaction routes for login, consent, confirm, and abort.
 * @param app Express application instance
 * @param provider OIDC Provider instance
 */
export default (app: Express, provider: Provider, directory: IDirectory) => {
  // GET /interaction/:uid - Handles login and consent prompts
  app.get('/interaction/:uid', async (req, res) => {
    try {
      const { uid, prompt, params, session } = await provider.interactionDetails(req, res);
      const client = await provider.Client.find(params.client_id as string);
      console.log(`[INTERACTION] GET /interaction/${uid} - prompt: ${prompt.name}, client: ${params.client_id}`);

      switch (prompt.name) {
        case 'login': {
          return res.render('login', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Sign-in',
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        case 'consent': {
          return res.render('consent', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Authorize',
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        default:
          console.warn(`[INTERACTION] Unknown prompt: ${prompt.name}`);
          return res.status(400).send('Unknown interaction prompt');
      }
    } catch (err) {
      console.error(`[INTERACTION] Error in GET /interaction/:uid:`, err);
      res.status(500).send('Internal Server Error');
    }
  });

  // POST /interaction/:uid/login - Handles login form submission
  app.post('/interaction/:uid/login', async (req, res, next) => {
    try {
      const interaction = await provider.interactionDetails(req, res);
      const { uid, prompt, params, session } = interaction;
      const { name } = prompt;
      assert.equal(name, 'login');
      const client = await provider.Client.find(params.client_id as string);

      const rawEmail = req.body.email;
      const rawPassword = req.body.password;

      // Start timing for attack prevention (must be before any validation)
      const startTime = Date.now();

      // Sanitize and validate inputs
      let email: string;
      let password: string;

      try {
        email = sanitizeInput(rawEmail);
        password = sanitizeInput(rawPassword);
      } catch (error) {
        console.warn(`[INTERACTION] Input validation error:`, error);

        // Ensure minimum response time even for validation errors
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_AUTH_RESPONSE_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_AUTH_RESPONSE_TIME - elapsedTime));
        }

        return res.status(400).render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session) : undefined,
          dbg: { params: debug(params), prompt: debug(prompt) },
          error: 'Invalid input provided',
        });
      }

      console.log(`[INTERACTION] POST /interaction/${uid}/login - email: ${email}`);

      if (!email || !password) {
        console.warn(`[INTERACTION] Missing email or password`);

        // Ensure minimum response time
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_AUTH_RESPONSE_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_AUTH_RESPONSE_TIME - elapsedTime));
        }

        return res.status(400).render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session) : undefined,
          dbg: { params: debug(params), prompt: debug(prompt) },
          error: 'Email and password are required',
        });
      }

      // Validate email format
      if (!isValidEmail(email)) {
        console.warn(`[INTERACTION] Invalid email format: ${email}`);

        // Ensure minimum response time
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_AUTH_RESPONSE_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_AUTH_RESPONSE_TIME - elapsedTime));
        }

        return res.status(400).render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session) : undefined,
          dbg: { params: debug(params), prompt: debug(prompt) },
          error: 'Invalid email format',
        });
      }

      const account = await directory.validate(email, password);

      // Constant-time comparison to prevent timing attacks
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_AUTH_RESPONSE_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_AUTH_RESPONSE_TIME - elapsedTime));
      }

      if (!account) {
        console.warn(`[INTERACTION] Invalid credentials for email: ${email}`);
        return res.status(401).render('login', {
          client,
          uid,
          details: prompt.details,
          params,
          title: 'Sign-in',
          session: session ? debug(session) : undefined,
          dbg: { params: debug(params), prompt: debug(prompt) },
          error: 'Invalid email or password',
        });
      }

      const result = {
        login: {
          accountId: account.accountId,
        },
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
      console.log(`[INTERACTION] Login successful for accountId: ${account.accountId}`);
    } catch (err) {
      console.error(`[INTERACTION] Error in POST /interaction/:uid/login:`, err);
      next(err);
    }
  });

  // POST /interaction/:uid/confirm - Handles consent confirmation
  app.post('/interaction/:uid/confirm', async (req, res, next) => {
    try {
      const interactionDetails = await provider.interactionDetails(req, res);
      const { prompt: { name, details }, params, session } = interactionDetails;
      assert.equal(name, 'consent');
      if (!session || !session.accountId) {
        console.warn(`[INTERACTION] No session or accountId found during consent`);
        throw new Error('No session or accountId found during consent interaction');
      }
      const { accountId } = session;
      let { grantId } = interactionDetails;
      let grant: any = undefined;
      if (grantId) {
        grant = await provider.Grant.find(grantId);
        console.log(`[INTERACTION] Modifying existing grant: ${grantId}`);
      } else {
        grant = new provider.Grant({
          accountId,
          clientId: params.client_id as string,
        });
        console.log(`[INTERACTION] Creating new grant for accountId: ${accountId}, clientId: ${params.client_id}`);
      }
      // Safely add OIDC scopes if present and array
      if (grant && Array.isArray(details.missingOIDCScope) && details.missingOIDCScope.length > 0) {
        grant.addOIDCScope(details.missingOIDCScope.join(' '));
        console.log(`[INTERACTION] Added OIDC scopes: ${details.missingOIDCScope.join(' ')}`);
      }
      // Safely add OIDC claims if present and array
      if (grant && Array.isArray(details.missingOIDCClaims) && details.missingOIDCClaims.length > 0) {
        grant.addOIDCClaims(details.missingOIDCClaims);
        console.log(`[INTERACTION] Added OIDC claims: ${details.missingOIDCClaims}`);
      }
      // Safely add resource scopes if present and object
      if (grant && details.missingResourceScopes && typeof details.missingResourceScopes === 'object') {
        for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
          if (Array.isArray(scopes) && scopes.length > 0) {
            grant.addResourceScope(indicator, scopes.join(' '));
            console.log(`[INTERACTION] Added resource scopes for ${indicator}: ${scopes.join(' ')}`);
          }
        }
      }
      if (!grant) {
        throw new Error('Grant object is undefined');
      }
      grantId = await grant.save();
      const consent: any = {};
      if (!interactionDetails.grantId && grantId) {
        consent.grantId = grantId;
      }
      const result = { consent };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
      console.log(`[INTERACTION] Consent granted for accountId: ${accountId}, grantId: ${grantId}`);
    } catch (err) {
      console.error(`[INTERACTION] Error in POST /interaction/:uid/confirm:`, err);
      next(err);
    }
  });

  // GET /interaction/:uid/abort - Handles user aborting the interaction
  app.get('/interaction/:uid/abort', async (req, res, next) => {
    try {
      console.log(`[INTERACTION] GET /interaction/${req.params.uid}/abort - User aborted interaction`);
      const result = {
        error: 'access_denied',
        error_description: 'End-User aborted interaction',
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      console.error(`[INTERACTION] Error in GET /interaction/:uid/abort:`, err);
      next(err);
    }
  });

  // Custom error renderer for OIDC errors
  app.get('/error', (req, res) => {
    const error = req.query.error as string || 'Unknown Error';
    const error_description = req.query.error_description as string;
    const state = req.query.state as string;

    console.log(`[INTERACTION] Rendering error page: ${error} - ${error_description}`);

    return res.render('error', {
      title: error,
      error,
      error_description,
      state,
    });
  });
};