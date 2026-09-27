# Orders Control Room Dashboard

A live dashboard for Breadfast's control-room orders. Safe to host publicly because
the auth token never reaches the browser — it lives only in Vercel's server-side
environment variables and is used by three small proxy functions.

```
bf-dashboard/
├── index.html        the dashboard page (static, safe to be public)
├── api/
│   ├── orders.js      proxies GET /control-room/orders/          (paginated order list)
│   ├── filters.js      proxies GET /control-room/orders/filters   (dropdown/aggregate data)
│   └── score.js         proxies GET /control-room/orders/score     (fast stage counts)
├── package.json
├── .gitignore
└── .env.example       documents the one required environment variable
```

## 1. Create a GitHub repository

1. Go to https://github.com/new
2. Name it something like `bf-control-room-dashboard`. Private is recommended.
3. Skip adding a README/gitignore from GitHub's UI (this folder already has them).
4. From this folder on your machine:
   ```bash
   git init
   git add .
   git commit -m "Initial dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/bf-control-room-dashboard.git
   git push -u origin main
   ```

## 2. Create a Vercel account and import the project

1. Go to https://vercel.com/signup and sign up with "Continue with GitHub".
2. Click **Add New… → Project** and select the repo you just pushed.
3. Leave the framework preset as "Other" — no build step is needed.
4. Before clicking **Deploy**, open **Environment Variables** and add:
   - Key: `BREADFAST_TOKEN`
   - Value: your full bearer token (just the token, without the word `Bearer`)
   - Apply to: Production, Preview, and Development
5. Click **Deploy**.

Vercel gives you a URL like `https://bf-control-room-dashboard.vercel.app`. Open it —
the dashboard starts pulling live orders immediately.

## 3. Day-to-day use

- The branch dropdown has one entry (`New Cairo FP #7`, fp id
  `66685682b5a5dd000ddf90c6`). To track another branch, add
  `{ id: '<fpId>', name: '<label>' }` to the `BRANCHES` array near the top of
  `index.html`'s `<script>` block, commit, and push — Vercel redeploys automatically.
- The refresh interval (15s / 30s / 60s / off) is a dropdown in the header.
- If the token expires or is rotated, update it in Vercel's Project Settings →
  Environment Variables → Edit, then redeploy (Vercel will prompt you after an env
  var change).

## 4. If the token ever leaks

Rotate/revoke it in Breadfast's internal auth system immediately, then update
`BREADFAST_TOKEN` in Vercel. Nothing else in this project needs to change.

## Notes on the data and the numbers shown

Field names in `index.html` (`orderId`, `orderNumber`, `customer.name`, `picker.name`,
`deliveryPerson[0].name`, `actualBags`, `recommendedBags`, `noOfCoffeeItems`, etc.) were
taken from a real response of `GET /control-room/orders/{orderId}`. The list endpoint
(`/control-room/orders/`) should return orders shaped the same way, but this hasn't been
directly confirmed against a captured list response — if a column shows up empty in the
dashboard, open your browser's Network tab on the real control room, find the list
request, and check the exact field name to adjust in `index.html`.

- **Bags adherence %** — orders where `actualBags === recommendedBags`, out of orders
  that have a `recommendedBags` value. Adjust the rule in `compute()` if ops defines it
  differently.
- **DPH** — total orders ÷ distinct delivery associates seen in the data ÷ 9 (an 8-hour
  shift + 1-hour break), mirroring the formula in the original control-room tool.
- **Stage** — read from `actions.current`, falling back to `pickingStatus` then `status`.
- **Late** — read from `deliveryStatus` ("On Time"/"Late"), falling back to `onTime`.

## Next step: Freshdesk complaints

Once this is live and the field names are confirmed against real traffic, the next
phase adds a `/api/complaints` proxy (mirroring your existing Freshdesk/Python tool)
and links each complaint to its order by order number, so the same dashboard shows
order details next to any related complaint.
