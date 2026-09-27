// GET /api/filters?fp=<fpId>&date=DD-MM-YYYY
// Proxies https://picker.breadfast.com/control-room/orders/filters — used to populate
// dropdown option lists and a couple of aggregate counts (status, deliveryStatus, etc).
export default async function handler(req, res) {
  const token = process.env.BREADFAST_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'BREADFAST_TOKEN is not set on the server.' });
    return;
  }

  const { fp, date } = req.query;
  if (!fp || !date) {
    res.status(400).json({ error: 'Query params "fp" and "date" are required.' });
    return;
  }

  try {
    const url = new URL('https://picker.breadfast.com/control-room/orders/filters');
    url.searchParams.set('page[limit]', '100');
    url.searchParams.set('page[offset]', '0');
    url.searchParams.set('pending_orders_only', 'false');
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
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(json.data || {});
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown error contacting upstream.' });
  }
}
