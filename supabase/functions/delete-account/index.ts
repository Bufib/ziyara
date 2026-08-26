import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

import {
  handleDeleteAccountRequest,
  type DeleteAccountDependencies,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function isLastAdministratorError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes('last administrator') ||
    normalizedMessage.includes('at least one administrator')
  );
}

function readRequestBody(request: Request) {
  return request.text().then((rawBody) => {
    if (!rawBody.trim()) {
      return null;
    }

    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return rawBody;
    }
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        code: 'deletion_failed',
        message: 'The account deletion service is not configured.',
      }),
      { headers: corsHeaders, status: 500 },
    );
  }

  // This privileged client exists only inside the Edge Function runtime. The
  // mobile/web bundle invokes the function with its normal user session.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const dependencies: DeleteAccountDependencies = {
    canDeleteCurrentUser: async (userId) => {
      // The public profile table intentionally grants no broad service-role
      // access. This narrowly scoped SECURITY DEFINER RPC is executable only
      // by service_role and provides the user-friendly preflight result.
      const { data, error } = await adminClient.rpc('can_delete_account', {
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      return data === true;
    },
    deleteCurrentUser: async (userId) => {
      const { error } = await adminClient.auth.admin.deleteUser(userId, false);

      return {
        errorCode: error
          ? isLastAdministratorError(error.message)
            ? 'last_admin'
            : 'unknown'
          : null,
      };
    },
    getAuthenticatedUserId: async (accessToken) => {
      // getUser(accessToken) performs a request to Auth and does not trust the
      // unverified session payload supplied by the client.
      const {
        data: { user },
        error,
      } = await adminClient.auth.getUser(accessToken);

      return error ? null : (user?.id ?? null);
    },
  };

  const result = await handleDeleteAccountRequest(
    {
      authorization: request.headers.get('Authorization'),
      body: await readRequestBody(request),
      method: request.method,
    },
    dependencies,
  );

  return new Response(JSON.stringify(result.body), {
    headers: corsHeaders,
    status: result.status,
  });
});
