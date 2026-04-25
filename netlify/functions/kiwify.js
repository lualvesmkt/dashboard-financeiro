exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const period = params.period || '30d';

    const end = new Date();
    const start = new Date();
    if (period === '7d') start.setDate(start.getDate() - 7);
    else if (period === '30d') start.setDate(start.getDate() - 30);
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);

    const CLIENT_ID = process.env.KIWIFY_CLIENT_ID || 'c23f5881-0d6e-4d7d-bdb7-65d4ff154770';
    const CLIENT_SECRET = process.env.KIWIFY_CLIENT_SECRET || '3d0de606b0177808e4bf7d52d1b737a706e3c8dee54784810e04';
    const ACCOUNT_ID = process.env.KIWIFY_ACCOUNT_ID || '7JXY6WRUTERDZ65';

    const tokenResp = await fetch('https://api.kiwify.com.br/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials' })
    });

    if (!tokenResp.ok) throw new Error('Falha ao obter token Kiwify');

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    const fmt = d => d.toISOString().substring(0, 10);
    const salesResp = await fetch(
      `https://api.kiwify.com.br/v1/sales?account_id=${ACCOUNT_ID}&start_date=${fmt(start)}&end_date=${fmt(end)}&page_size=100`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!salesResp.ok) throw new Error('Falha ao buscar vendas Kiwify');

    const salesData = await salesResp.json();
    const sales = salesData.data || salesData.results || salesData || [];

    let total = 0;
    const products = {};
    const transactions = [];

    (Array.isArray(sales) ? sales : []).forEach(s => {
      if (s.status === 'paid' || s.status === 'approved' || s.status === 'complete') {
        const val = parseFloat(s.amount || s.total || s.product_price || 0) / 100;
        total += val;
        const pname = s.product_name || s.product?.name || 'Produto Kiwify';
        products[pname] = (products[pname] || 0) + val;
        transactions.push({
          date: (s.created_at || s.approved_at || '').substring(0, 10),
          desc: pname,
          amount: val,
          type: 'credit',
          source: 'kiwify'
        });
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total,
        sales_count: transactions.length,
        products: Object.entries(products).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val),
        transactions: transactions.slice(0, 30)
      })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
