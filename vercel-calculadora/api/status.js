// ============================================================
//  GET /api/status?id=PAGAMENTO&token=TOKEN
//  Consulta o Mercado Pago. Se (e SOMENTE se) o pagamento
//  estiver aprovado, calcula as verbas no servidor e devolve
//  o resultado. Sem pagamento aprovado, não devolve valores.
// ============================================================
const { calcular } = require('./_calculo');

module.exports = async (req, res) => {
  if (!process.env.MP_ACCESS_TOKEN) {
    res.status(500).json({ erro: 'MP_ACCESS_TOKEN não configurado no Vercel.' });
    return;
  }
  try {
    const { id, token } = req.query;
    if (!id || !token) {
      res.status(400).json({ erro: 'Parâmetros ausentes.' });
      return;
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(id), {
      headers: { 'Authorization': 'Bearer ' + process.env.MP_ACCESS_TOKEN }
    });
    const data = await mpRes.json();
    if (!mpRes.ok) {
      res.status(500).json({ erro: 'Falha ao consultar o pagamento.' });
      return;
    }

    const meta = data.metadata || {};
    // confere o token: só o dono da cobrança recebe o resultado
    if (meta.token !== token) {
      res.status(403).json({ erro: 'Token inválido.' });
      return;
    }

    const status = data.status; // approved, pending, rejected...
    if (status !== 'approved') {
      res.status(200).json({ pago: false, status });
      return;
    }

    // PAGO ✓ — agora sim calcula e devolve
    const resultado = calcular(meta.adm, meta.dem, meta.sal, meta.motivo, meta.aviso, meta.ferias);
    res.status(200).json({ pago: true, status, resultado });
  } catch (e) {
    res.status(500).json({ erro: 'Erro interno.', detalhe: String(e) });
  }
};
