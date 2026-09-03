import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

type EmergencyNotificationClaim = {
  attempt_id: number;
  expo_push_token: string;
  locale: string;
  request_id: number;
  target_team: 'medical' | 'travel';
};

type ExpoPushTicket = {
  details?: { error?: string };
  message?: string;
  status?: string;
};

const translations = {
  ar: {
    body: 'وصل بلاغ طارئ جديد. افتح صندوق الرسائل المحمي لقراءته.',
    medical: 'حالة طارئة طبية',
    travel: 'طلب مساعدة لفريق الرحلة',
  },
  de: {
    body: 'Eine neue Notfallmeldung ist eingegangen. Öffne zum Lesen das geschützte Postfach.',
    medical: 'Medizinischer Notfall',
    travel: 'Hilfeanfrage an das Reiseteam',
  },
  en: {
    body: 'A new emergency report has arrived. Open the protected inbox to read it.',
    medical: 'Medical emergency',
    travel: 'Travel team assistance request',
  },
} as const;

function getBearerToken(authorization: string | null) {
  return authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

function readRequestId(body: unknown) {
  if (!body || typeof body !== 'object' || !('requestId' in body)) return null;
  const requestId = (body as { requestId?: unknown }).requestId;
  return typeof requestId === 'number' && Number.isSafeInteger(requestId) && requestId > 0
    ? requestId
    : null;
}

function notificationFor(claim: EmergencyNotificationClaim) {
  const locale = claim.locale === 'ar' || claim.locale === 'en' ? claim.locale : 'de';

  return {
    body: translations[locale].body,
    channelId: 'emergency-alerts',
    data: {
      kind: 'emergency_request',
      requestId: claim.request_id,
      route: '/emergency',
    },
    priority: 'high',
    sound: 'default',
    title: translations[locale][claim.target_team],
    to: claim.expo_push_token,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ code: 'method_not_allowed', message: 'POST is required.' }),
      { headers: corsHeaders, status: 405 },
    );
  }

  const accessToken = getBearerToken(request.headers.get('Authorization'));
  if (!accessToken) {
    return new Response(
      JSON.stringify({ code: 'unauthorized', message: 'Authentication is required.' }),
      { headers: corsHeaders, status: 401 },
    );
  }

  let requestId: number | null = null;
  try {
    requestId = readRequestId(await request.json());
  } catch {
    requestId = null;
  }

  if (!requestId) {
    return new Response(
      JSON.stringify({ code: 'invalid_request', message: 'A valid requestId is required.' }),
      { headers: corsHeaders, status: 400 },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ code: 'dispatch_failed', message: 'Service is not configured.' }),
      { headers: corsHeaders, status: 500 },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  try {
    const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
    const userId = userError ? null : userData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ code: 'unauthorized', message: 'Authentication is required.' }),
        { headers: corsHeaders, status: 401 },
      );
    }

    const { data, error } = await adminClient.rpc('claim_emergency_notification_attempts', {
      p_request_id: requestId,
      p_requester_user_id: userId,
    });
    if (error) throw error;

    const claims = (data ?? []) as EmergencyNotificationClaim[];
    let accepted = 0;

    for (let offset = 0; offset < claims.length; offset += 100) {
      const batch = claims.slice(offset, offset + 100);
      let tickets: ExpoPushTicket[] = [];
      let responseError = 'expo_request_failed';

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          body: JSON.stringify(batch.map(notificationFor)),
          headers: {
            ...(Deno.env.get('EXPO_ACCESS_TOKEN')
              ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
              : {}),
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        responseError = `expo_http_${response.status}`;
        if (response.ok) {
          const payload = (await response.json()) as { data?: ExpoPushTicket[] };
          tickets = payload.data ?? [];
        }
      } catch {
        tickets = [];
      }

      await Promise.all(
        batch.map(async (claim, index) => {
          const ticket = tickets[index];
          const wasAccepted = ticket?.status === 'ok';
          if (wasAccepted) accepted += 1;

          const { error: completionError } = await adminClient.rpc(
            'complete_emergency_notification_attempt',
            {
              p_accepted: wasAccepted,
              p_attempt_id: claim.attempt_id,
              p_error_code: wasAccepted
                ? ''
                : (ticket?.details?.error ?? ticket?.message ?? responseError),
            },
          );
          if (completionError) throw completionError;
        }),
      );
    }

    return new Response(
      JSON.stringify({
        accepted,
        claimed: claims.length,
        code: 'dispatched',
        failed: claims.length - accepted,
        message: 'Emergency push notifications were processed.',
      }),
      { headers: corsHeaders, status: 200 },
    );
  } catch {
    return new Response(
      JSON.stringify({
        code: 'dispatch_failed',
        message: 'Emergency push notifications could not be dispatched.',
      }),
      { headers: corsHeaders, status: 500 },
    );
  }
});
