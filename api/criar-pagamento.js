// ============================================================
//  POST /api/criar-pagamento
//  Recebe os dados do formulário, cria uma cobrança PIX de
//  R$ 14,90 no Mercado Pago e devolve o QR Code para o cliente.
//  Os dados do cálculo ficam guardados na PRÓPRIA cobrança
//  (metadata), e só são calculados depois do pagamento.
// ============================================================
const crypto = require('crypto');
const { calcular } = require('./_calculo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado no Vercel.' });
    return;
  }

  try {
    const body = req.body || {};
    const { adm, dem, sal, motivo, aviso, ferias } = body;

    // validação básica
    if (!adm || !dem || !sal || parseFloat(sal) <= 0) {
      res.status(400).json({ erro: 'Preencha admissão, demissão e salário.' });
      return;
    }
    if (new Date(dem) <= new Date(adm)) {
      res.status(400).json({ erro: 'A data de demissão deve ser depois da admissão.' });
      return;
    }

    // token secreto que liga este cliente a esta cobrança
    const token = crypto.randomBytes(12).toString('hex');

    // calcula só os RÓTULOS das verbas (nomes), sem valores,
    // para a prévia borrada — valores nunca saem antes de pagar
    const previa = calcular(adm, dem, sal, motivo, aviso, ferias);
    const verbaLabels = previa.verbas.filter(v => !v.info).map(v => v.n);

    // cria a cobrança PIX no Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: 14.90,
        description: 'Cálculo de verbas rescisórias',
        payment_method_id: 'pix',
        payer: { email: 'cliente-' + token + '@calculadorafrank.com.br' },
        metadata: { adm, dem, sal: String(sal), motivo, aviso, ferias, token }
      })
    });

    const data = await mpRes.json();
    if (!mpRes.ok) {
      const causa = Array.isArray(data.cause) && data.cause.length ? (' [' + data.cause.map(c => (c.description || c.code)).join('; ') + ']') : '';
      res.status(500).json({ erro: 'Falha ao criar a cobrança no Mercado Pago.', detalhe: (data.message || JSON.stringify(data)) + causa });
      return;
    }

    const tx = data.point_of_interaction && data.point_of_interaction.transaction_data;
    res.status(200).json({
      paymentId: String(data.id),
      token,
      verbaLabels,
      qrCode: tx ? tx.qr_code : null,
      qrCodeBase64: tx ? tx.qr_code_base64 : null,
      ticketUrl: tx ? tx.ticket_url : null
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.', detalhe: String(e) });
  }
};
