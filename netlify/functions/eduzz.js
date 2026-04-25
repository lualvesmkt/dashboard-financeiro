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

    const fmt = d => d.toISOString().substring(0, 10);

    const EDUZZ_PUB = process.env.EDUZZ_PUBLIC_KEY || '91623476';
    const EDUZZ_KEY = process.env.EDUZZ_API_KEY || '57DF93F5D1';

    const url = `https://api2.eduzz.com/sale/get_sale_list?publickey=${EDUZZ_PUB}&apikey=${EDUZZ_KEY}&date_start=${fmt(start)}&date_end=${fmt(end)}&page_size=100`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || !data.data || !data.data.sale) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: 'Sem vendas no período' }) };
    }

    const sales = data.data.sale;
    let total = 0;
    const products = {};
    const transactions = [];

    sales.forEach(s => {
      const val = parseFloat(s.sale_price || 0);
      total += val;
      const pname = s.content_title || 'Produto';
      products[pname] = (products[pname] || 0) + val;
      transactions.push({
        date: (s.sale_date || '').substring(0, 10),
        desc: s.content_title || 'Venda Eduzz',
        amount: val,
        type: 'credit',
        source: 'eduzz'
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total,
        sales_count: sales.length,
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
