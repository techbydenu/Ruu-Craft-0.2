# Ruu Craft — Supabase-connected website

This version uses Supabase for shared products, orders, product photos, and private receipt uploads.

## 1. Configure the website

The `supabase-config.js` file is already filled with the Project URL and Publishable key you supplied. The Data API URL you gave ends in `/rest/v1/`; the client config correctly uses the base project URL `https://qdwsmhyyizfrpjxqgwql.supabase.co`.

Do **not** use a Secret key or `service_role` key in browser code.

## 2. Run the database setup

In Supabase, open SQL Editor → New query. Copy the contents of `supabase-setup.sql` into the editor and click Run.

This creates the `products`, `admin_users`, and `orders` tables, RLS policies, and two Storage buckets. It also adds policies for public active-product reads and admin-only product/order management.

Note: the existing `products` table is preserved. The setup script is safe to run again for its policies and buckets.

## 3. Create an admin login

1. In Supabase Dashboard, open Authentication → Users.
2. Add a user with the admin email and a strong password. Confirm the user if the dashboard offers that option.
3. Copy that user's UUID / ID from the users list.
4. Open SQL Editor and run the following, replacing the placeholder with the UUID (not the email):

```sql
insert into public.admin_users (user_id)
values ('PASTE_AUTH_USER_UUID_HERE')
on conflict (user_id) do nothing;
```

Only user IDs in `public.admin_users` have admin privileges. The old hard-coded demo passcode is no longer used.

## 4. Publish the files

Upload the contents of this folder to the root of your GitHub repository (so `index.html` is at the root) and deploy the updated commit to Cloudflare. Ensure `supabase-config.js` is included in the deployment.

## 5. Test

- Open the public website: active products load from Supabase.
- Sign in via Admin Login using the admin email/password created above.
- Add a product with an image under 5 MB; it should appear for everyone after refresh.
- Submit a test order and verify it appears in the admin's Order receipts tab.
- Receipt files are private; only admins can create signed links to view them.

## Security notes

- Never publish the Supabase Secret key or `service_role` key.
- Keep Row Level Security enabled.
- Admin account must be explicitly added to `public.admin_users`.
- Receipt upload is allowed to anonymous visitors so customers can submit an order with a receipt. Keep file size limits in place and verify payment independently before accepting.
- The site can prefill WhatsApp text but cannot automatically attach a photo to WhatsApp from a normal browser.

## Existing design

The pink / white / purple design, categories, logo, cover art, video, animations, and WhatsApp contact are retained.
