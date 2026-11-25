# Customer account administration setup

The Java manager calls the `customer-admin` Supabase Edge Function over HTTPS. Normally it sends a staff user's short-lived Supabase access token. The function validates that token with Supabase Auth and checks the verified UUID against a server-side allowlist before using the server-only service role key. The service role key must never be added to Java files, Java configuration, or this website's frontend.

For temporary database testing when no staff auth account exists, the function also supports an explicitly enabled shared-key mode. This still requires a random 32-character-or-longer secret; it does not make the data endpoint anonymous. Keep this key only in Supabase Edge Function secrets and the trusted Java manager computer, and disable test mode/remove the key after testing. Anyone who obtains the test key can read customer account and wishlist data.

## Database migration

Run `migrations/202611210001_wishlist_activity.sql` in the Supabase SQL Editor (or apply it through the Supabase CLI). It creates a private activity table, grants read access only to the server-side `service_role`, backfills the latest surviving `created_at` value, and installs insert/delete triggers. Deletions write a fresh timestamp to the independent activity row, even when the deleted wishlist row was the customer's last item. Existing wishlist rows are untouched. Customers whose entire wishlist was removed before this migration have no historical deletion timestamp to backfill.

## Deploy the function

Deploy the `customer-admin` function with the project CLI, for example:

```sh
supabase functions deploy customer-admin
```

For shared-key test mode, disable the platform's JWT gate because the function performs its own key check:

```sh
supabase functions deploy customer-admin --no-verify-jwt
```

Set these Edge Function secrets in the Supabase project:

- `CUSTOMER_ADMIN_STAFF_USER_IDS`: comma-separated UUIDs of staff users already present in Supabase Auth. This allowlist is checked against the UUID returned by verified `auth.getUser`; an email or client-provided admin flag is never trusted.
- `CUSTOMER_ADMIN_TEST_MODE`: set to `true` only while using temporary shared-key testing.
- `CUSTOMER_ADMIN_TEST_KEY`: a random secret of at least 32 characters, required when test mode is enabled.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role key, stored only in the Edge Function environment.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: the function's Supabase project URL and public key, used only to verify the bearer session.

Generate a temporary key locally in PowerShell with:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Copy the resulting 64-character value into `CUSTOMER_ADMIN_TEST_KEY` in Supabase Edge Function secrets and into the Java manager's `CUSTOMER_ADMIN_TEST_KEY` environment variable. Set `CUSTOMER_ADMIN_TEST_MODE` to `true` in Supabase, then deploy with `--no-verify-jwt`. The function itself checks the key on every request. When testing is complete, remove the Java variable, turn off test mode, remove the server secret, and redeploy with the normal JWT verification setting.

Configure these environment variables on each trusted Java manager computer/session:

- `CUSTOMER_ADMIN_API_URL`: `https://<project-ref>.supabase.co/functions/v1/customer-admin`
- `CUSTOMER_ADMIN_ACCESS_TOKEN`: a current access token obtained after the staff user signs in through a trusted staff authentication flow. It is not the service-role key. Access tokens expire; replace it after signing in again.
- `CUSTOMER_ADMIN_TEST_KEY`: the same temporary test key configured in Supabase. If set, the Java manager uses it instead of the staff access token.

This project does not currently contain a staff sign-in/token refresh screen. Until one is built, provision the access token through the store's secure operational process and avoid saving it in the distributed application or shared config files. For temporary testing, use the shared key and disable test mode afterwards. Without a valid staff token or enabled test key, the account panel reports a configuration/authentication error; it does not fall back to public access.

## API contract

- `GET ?resource=accounts` returns user UUID, email, registration time, email verification state, wishlist count, and latest wishlist activity. Activity sorts newest first; customers without activity sort last.
- `GET ?resource=wishlist&user_id=<uuid>` returns item number and date added for that customer.

Both endpoints require `Authorization: Bearer <staff access token>`. The API does not return auth hashes, refresh/recovery tokens, or any other credential. Customer-facing RLS policies on `wishlist_items` remain unchanged.

## Verification requiring Supabase

After applying the migration and deploying/configuring the function, sign in as an allowlisted staff user, set the two Java environment variables, and open **Account Data**. Verify that an unauthorized token receives HTTP 401/403, active customers sort ahead of customers with no activity, adding and deleting items changes the activity timestamp, and selecting a customer displays products resolved from the Java manager's local inventory. The local project does not contain a Supabase service credential, so live API and trigger behavior must be checked against the hosted project.
