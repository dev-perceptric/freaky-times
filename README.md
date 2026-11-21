# FreakyTimes storefront

Dressed to be undressed. A Next.js 14 lingerie store for freakytimes.com, built from the Blazed Kitty store code. Products come from AliExpress (and CJ Dropshipping when needed), paid through Stripe and ordered from the supplier on their own. Women-only, no sex toys.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no products yet, the home page shows an "Opening soon" hero.

## Store layout

Lines and categories live in `lib/taxonomy.ts`. Collections (the pages under `/collections/...`) live in `lib/catalog.ts` and fill themselves from each product's category and name.

| Line | Categories |
|---|---|
| Lingerie | Bra & Panty Sets, Bodysuits & Teddies, Babydolls & Chemises, Corsets & Bustiers, Bras & Bralettes, Panties & Thongs, Garters & Harnesses |
| Sleep & Lounge | Robes & Kimonos, Pajama Sets, Slips & Nightgowns |
| Legwear | Stockings & Thigh Highs, Bodystockings & Fishnets |
| Costumes | Costumes & Roleplay (bunny, maid, nurse, kitty pages) |
| Clubwear & Swim | Bodycon & Mini Dresses, Matching Sets, Bikinis & Swim |
| Accessories | Chokers & Collars, Body Chains & Jewelry, Masks & Blindfolds, Gloves & Sleeves, Pasties & Covers |

Vibe pages (Lace, Sheer & Mesh, Satin & Silk, Leather & Latex, Strappy, Cute & Coquette, Bridal, Goth, Plus Size, Red, Black) are read from words in product names.

## Adding AliExpress products (the + FreakyTimes button)

1. Put `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` and `ADMIN_TOKEN` in the server `.env`.
2. Sign in once: open `https://freakytimes.com/api/aliexpress/connect?key=ADMIN_TOKEN` and approve.
3. Open https://freakytimes.com/admin/queue, enter `ADMIN_TOKEN` once, and drag the **+ FreakyTimes** button to the bookmarks bar.
4. On any AliExpress page (a store, a search, your wishlist), scroll to the bottom and click the button. Every product on the page is saved to the import list, without duplicates.
5. Each batch:
   ```bash
   python3 scripts/ae_queue.py pull /tmp/batch.json      # everything waiting
   python3 scripts/ae_import.py /tmp/batch.json          # sort into sections; skips kids' items, anything hinting at minors, sex toys and brand art
   python3 scripts/ae_catalog.py                         # pull sizes, colors, costs and photos
   python3 scripts/ae_tidy.py /tmp/batch.json --from N   # multi-pack prices, over $90, generic names
   # photo check: remove anything with brands, characters or real people; add their ids to scripts/ae_blocked.json
   python3 scripts/ae_blurbs.py && python3 scripts/ae_catalog.py
   python3 scripts/ae_queue.py sync /tmp/batch.json      # mark added / skipped
   ```

`scripts/ae_cats.py` and `scripts/ae_import.py` decide the category from the product title ("Red Lace Bra Set" goes to Bra & Panty Sets). Pick a category by hand in `scripts/ae_picks.json` when they get it wrong.

## CJ Dropshipping products

1. Find products: `python3 scripts/cj_search.py "lace bodysuit" --us` (`--us` = US warehouse, faster shipping).
2. Add picks to `scripts/cj_picks.json`: `[{ "pid": "1234-ABCD", "category": "bodysuits" }]`, plus optional `name`, `price`, `blurb`.
3. Run `python3 scripts/cj_catalog.py`. It prices each item at CJ cost × 2 plus shipping unless you set `price`.

## Product photos

Photos are copied into the `freaky-times` Cloudflare R2 bucket, with ready-made WebP copies at 200, 480, 828 and 1200 px under `w/`. The public address is `https://pub-cf5b5b1875ae4569a8c701274e2ae2bf.r2.dev` for now. Cloudflare limits r2.dev traffic, so before launch connect `img.freakytimes.com` to the bucket (R2 → freaky-times → Settings → Custom domains, which needs freakytimes.com on Cloudflare DNS) and change the address in `lib/img.ts`, `lib/taxonomy.ts`, `next.config.mjs` and `scripts/make_sizes.py`.

## Orders

1. Checkout sends the buyer to Stripe. Each line item carries the product slug, color and size.
2. Stripe calls `/api/stripe-webhook` after payment. The webhook orders AliExpress items with the AliExpress account's payment method and CJ items from the CJ wallet.
3. Order numbers start with `FT-`. Track Order looks them up in Stripe, so use a Stripe account for FreakyTimes only.

Stripe allows lingerie and clothing. Keep sex toys off this store, since Stripe doesn't allow them.

## Deploy (OVH server)

Every push to `main` builds `ghcr.io/dev-perceptric/freaky-times` in GitHub Actions. The server's autodeploy container (set up from the blazed-kitty repo) updates any app in `/docker` that uses a `ghcr.io/dev-perceptric/` image.

One-time setup on the server (one paste, safe to run again):

```bash
curl -fsSL https://raw.githubusercontent.com/dev-perceptric/freaky-times/main/ops/setup-server.sh | sudo bash
```

`ops/setup-server.sh` finds the running Blazed Kitty container and copies how it is wired up (Traefik labels, Caddy or nginx), creates `/docker/freaky-times` with `docker-compose.yml` and `.env` (copying the AliExpress, CJ and Resend keys from Blazed Kitty and making a new `ADMIN_TOKEN`), adds freakytimes.com to the same reverse proxy after a config test, starts the store and prints the admin links.

After it runs:

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from the FreakyTimes Stripe account to `/docker/freaky-times/.env`, then `cd /docker/freaky-times && sudo docker compose up -d`.
2. Stripe Dashboard → Webhooks → add `https://freakytimes.com/api/stripe-webhook` with `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
3. Stripe → Settings → Business → Public details: set the statement descriptor to something neutral like `FT GOODS`, since the FAQ promises a neutral name on card statements.
4. AliExpress: nothing to do when Blazed Kitty is signed in. An AliExpress account only gets one dropshipping app, so FreakyTimes reads Blazed Kitty's saved sign-in read-only (`ALIEXPRESS_TOKEN_FILE` + `ALIEXPRESS_TOKEN_READONLY=true`) and Blazed Kitty keeps it fresh.

`ops/docker-compose.yml` is a plain example of the same setup, for doing it by hand.
