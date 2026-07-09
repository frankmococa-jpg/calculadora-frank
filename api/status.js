// ============================================================
//  GET /api/status?ref=REFERENCIA  (CHECKOUT PRO)
//  Procura no Mercado Pago um pagamento APROVADO com essa
//  referência. Só se estiver aprovado, calcula e devolve o
//  resultado (o cálculo nunca sai antes do pagamento).
// ============================================================
const { calcular } = require('./_calculo');

module.exports = async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) { res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado no Vercel.' }); return; }
  try {
    const { ref } = req.query;
    if (!ref) { res.status(400).json({ erro: 'Parâmetro ausente.' }); return; }

    const url = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(ref);
    const r = await fetch(url, { headers: { 'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN } });
    const data = await r.json();
    if (!r.ok) { res.status(500).json({ erro: 'Falha ao consultar o pagamento.' }); return; }

    const results = data.results || [];
    const aprovado = results.find(p => p.status === 'approved');
    if (!aprovado) { res.status(200).json({ pago: false }); return; }

    // PAGO ✓ — decodifica os dados da referência e calcula
    const b64 = String(ref).split('.')[1] || '';
    const inputs = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    const resultado = calcular(inputs.adm, inputs.dem, inputs.sal, inputs.motivo, inputs.aviso, inputs.ferias);
    res.status(200).json({ pago: true, resultado });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.', detalhe: String(e) });
  }
};
