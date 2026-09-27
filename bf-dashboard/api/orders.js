// GET /api/orders?fp=<fpId>&date=DD-MM-YYYY&pendingOnly=false
// Proxies https://picker.breadfast.com/control-room/orders/ and hides the auth token
// from the browser. Paginates through every page until the API stops returning rows.
export default async function handler(req, res) {
  const token = process.env.BREADFAST_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'BREADFAST_TOKEN is not set on the server.' });
    return;
  }

  const { fp, date, pendingOnly } = req.query;
  if (!fp || !date) {
    res.status(400).json({ error: 'Query params "fp" and "date" are required.' });
    return;
  }

  const limit = 100;
  let offset = 0;
  let all = [];

  try {
    // Loop until a page comes back short of `limit` (i.e. the last page),
    // rather than trusting a total count field whose exact name/shape we
    // haven't confirmed from a real list response yet.
    while (true) {
      const url = new URL('https://picker.breadfast.com/control-room/orders/');
      url.searchParams.set('page[limit]', String(limit));
      url.searchParams.set('page[offset]', String(offset));
      url.searchParams.set('pending_orders_only', pendingOnly === 'true' ? 'true' : 'false');
      url.searchParams.append('fps[]', fp);
      url.searchParams.set('type', 'on-demand');
      url.searchParams.set('date', date);

      const upstream = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream error ${upstream.status}` });
        return;
      }

      const json = await upstream.json();
      if (json.success === false) {
        res.status(502).json({ error: json.message || 'Upstream returned failure.' });
        return;
      }

      const batch = Array.isArray(json.data) ? json.data : (json.data?.orders || []);
      all = all.concat(batch);
      offset += limit;

      if (batch.length < limit) break; // last page
      if (offset > 8000) break; // safety guard against a runaway loop
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ orders: all, count: all.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown error contacting upstream.' });
  }
}
