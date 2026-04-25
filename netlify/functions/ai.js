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
    const body = JSON.parse(event.body || '{}');
    const { question, context } = body;

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY nao configurada' }) };

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, system: context, messages: [{ role: 'user', content: question }] })
    });

    const data = await resp.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, answer: data.content?.[0]?.text || 'Sem resposta' }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
