// ============================================================
//  POST /api/criar-pagamento  (CHECKOUT PRO)
//  Cria uma "preferência" de pagamento no Mercado Pago e devolve
//  o link (init_point) da página segura de pagamento.
//  Os dados do cálculo vão codificados no external_reference,
//  e o cálculo só é feito depois que o pagamento é aprovado.
// ============================================================
const crypto = require('crypto');
const { calcular } = require('./_calculo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido' }); return; }
  if (!process.env.MP_ACCESS_TOKEN) { res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado no Vercel.' }); return; }

  try {
    const b = req.body || {};
    const { adm, dem, sal, motivo, aviso, ferias, nome, email, recebido } = b;

    if (!adm || !dem || !sal || parseFloat(sal) <= 0) { res.status(400).json({ erro: 'Preencha admissão, demissão e salário.' }); return; }
    if (new Date(dem) <= new Date(adm)) { res.status(400).json({ erro: 'A data de demissão deve ser depois da admissão.' }); return; }

    // os dados do cálculo vão codificados na referência (nunca o resultado)
    const inputs = { adm, dem, sal: String(sal), motivo, aviso, ferias, recebido: (recebido !== undefined && recebido !== null && recebido !== '') ? String(recebido) : '' };
    const salt = crypto.randomBytes(4).toString('hex');
    const ref = salt + '.' + Buffer.from(JSON.stringify(inputs)).toString('base64url');

    // prévia: só os NOMES das verbas, para a lista borrada
    const previa = calcular(adm, dem, sal, motivo, aviso, ferias, recebido);
    const verbaLabels = previa.verbas.filter(v => !v.info).map(v => v.n);

    const origin = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host);

    const pref = {
      items: [{ title: 'Cálculo de verbas rescisórias', quantity: 1, currency_id: 'BRL', unit_price: 14.90 }],
      external_reference: ref,
      back_urls: { success: origin, failure: origin, pending: origin },
      statement_descriptor: 'CALC RESCISAO'
    };
    if (email) pref.payer = { email: email, name: (nome || '').split(' ')[0] };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref)
    });
    const data = await mpRes.json();
    if (!mpRes.ok) {
      const tokenTipo = (process.env.MP_ACCESS_TOKEN || '').slice(0, 8);
      res.status(500).json({ erro: 'Falha ao criar o pagamento no Mercado Pago.', detalhe: (data.message || JSON.stringify(data)) + ' | token: ' + tokenTipo });
      return;
    }

    // usa o link de produção; se vier só o de sandbox (credencial de teste), usa esse
    const link = data.init_point || data.sandbox_init_point;
    res.status(200).json({ ref, verbaLabels, initPoint: link });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.', detalhe: String(e) });
  }
};
