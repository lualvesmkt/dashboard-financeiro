exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const params = event.queryStringParameters || {};
    const period = params.period || '30d';
    const end = new Date(); const start = new Date();
    if (period === '7d') start.setDate(start.getDate() - 7);
    else if (period === '30d') start.setDate(start.getDate() - 30);
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);
    const TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!TOKEN) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'MP_ACCESS_TOKEN nao configurada' }) };
    const url = `https://api.mercadopago.com/v1/payments/search?status=approved&begin_date=${start.toISOString()}&end_date=${end.toISOString()}&limit=100`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!resp.ok) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: await resp.text() }) };
    const data = await resp.json();
    let total = 0;
    const txns = (data.results || []).map(p => { total += p.transaction_amount||0; return { date:(p.date_created||'').substring(0,10), desc:p.description||'Pagamento MP', amount:p.transaction_amount||0, type:'credit', source:'mp' }; });
    let balance=0; try { const b=await(await fetch('https://api.mercadopago.com/v1/account/balance',{headers:{Authorization:`Bearer ${TOKEN}`}})).json(); balance=b.available_balance||0; } catch(e){}
    return { statusCode: 200, headers, body: JSON.stringify({ success:true, total, balance, transactions:txns.slice(0,30) }) };
  } catch (err) { return { statusCode: 200, headers, body: JSON.stringify({ success:false, error:err.message }) }; }
};
