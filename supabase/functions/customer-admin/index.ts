import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-customer-admin-test-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function constantTimeEquals(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return respond(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const testMode = Deno.env.get("CUSTOMER_ADMIN_TEST_MODE") === "true";
  const testKey = Deno.env.get("CUSTOMER_ADMIN_TEST_KEY") ?? "";
  const staffIds = new Set(
    (Deno.env.get("CUSTOMER_ADMIN_STAFF_USER_IDS") ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean),
  );
  if (!supabaseUrl || !serviceRoleKey || (testMode && testKey.length < 32)) {
    return respond(503, { error: "Customer administration is not configured" });
  }

  let operation = "starting the request";
  try {
    const suppliedTestKey = request.headers.get("X-Customer-Admin-Test-Key") ?? "";
    const testAuthorized = testMode && constantTimeEquals(suppliedTestKey, testKey);
    if (!testAuthorized) {
      // Verify the bearer token with Supabase Auth; never trust identity claims
      // supplied by the Java client. Staff membership is controlled by env only.
      if (!match) return respond(401, { error: "Authentication required" });
      if (!anonKey || staffIds.size === 0) {
        return respond(503, { error: "Staff authentication is not configured" });
      }
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser(match[1]);
      if (authError || !user) return respond(401, { error: "Invalid or expired session" });
      if (!staffIds.has(user.id)) return respond(403, { error: "Staff access required" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");

    if (resource === "accounts") {
      operation = "listing customer accounts";
      const accounts: Array<Record<string, unknown>> = [];
      let page = 1;
      const perPage = 500;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        for (const user of data.users) {
          accounts.push({
            userId: user.id,
            email: user.email ?? "",
            registeredAt: user.created_at,
            emailVerified: Boolean(user.email_confirmed_at),
          });
        }
        if (data.users.length < perPage) break;
        page++;
      }

      const activity: Array<{ user_id: string; last_updated: string }> = [];
      const counts: Array<{ user_id: string }> = [];
      operation = "reading wishlist activity";
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin.from("wishlist_activity")
          .select("user_id,last_updated").range(offset, offset + 999);
        if (error) throw error;
        activity.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      operation = "counting wishlist items";
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin.from("wishlist_items")
          .select("user_id").range(offset, offset + 999);
        if (error) throw error;
        counts.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }

      const activityByUser = new Map<string, string>(activity.map((entry): [string, string] =>
        [entry.user_id, entry.last_updated]));
      const countByUser = new Map<string, number>();
      for (const row of counts) {
        countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
      }
      const result = accounts.map((account) => ({
        ...account,
        wishlistItemCount: countByUser.get(account.userId as string) ?? 0,
        lastWishlistUpdate: activityByUser.get(account.userId as string) ?? null,
      }));
      result.sort((a, b) => {
        const left = a.lastWishlistUpdate as string | null;
        const right = b.lastWishlistUpdate as string | null;
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return right.localeCompare(left);
      });
      return respond(200, result);
    }

    if (resource === "wishlist") {
      const userId = url.searchParams.get("user_id") ?? "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return respond(400, { error: "A valid customer UUID is required" });
      }
      operation = "loading the selected wishlist";
      const { data, error } = await admin.from("wishlist_items")
        .select("item_number,created_at").eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return respond(200, (data ?? []).map((row) => ({
        itemNumber: row.item_number,
        dateAdded: row.created_at,
      })));
    }
    return respond(400, { error: "Unknown resource" });
  } catch (error) {
    // Keep details server-side; never log authorization headers or credentials.
    console.error("Customer admin request failed", {
      operation,
      message: error instanceof Error ? error.message : String(error),
    });
    return respond(502, { error: `Customer data request failed while ${operation}` });
  }
});
