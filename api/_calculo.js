// ============================================================
//  LÓGICA DE CÁLCULO DAS VERBAS RESCISÓRIAS (roda no SERVIDOR)
//  Fica escondida do navegador — só é executada e devolvida
//  DEPOIS que o Mercado Pago confirma o pagamento.
//  Regras CLT: ano de 365 dias, mês de 30 dias.
// ============================================================
const DAY = 86400000;
const diffDays = (a, b) => Math.round((b - a) / DAY);

// Conta "avos": meses-calendário em que se trabalhou 15+ dias
function mesesAvos(start, end) {
  if (!start || !end || end < start) return 0;
  let avos = 0, y = start.getFullYear(), m = start.getMonth();
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth())) {
    const mStart = new Date(y, m, 1);
    const mEnd = new Date(y, m + 1, 0);
    const s = start > mStart ? start : mStart;
    const e = end < mEnd ? end : mEnd;
    if (diffDays(s, e) + 1 >= 15) avos++;
    m++; if (m > 11) { m = 0; y++; }
  }
  return avos;
}

function calcular(admStr, demStr, sal, motivo, aviso, feriasVenc) {
  const adm = new Date(admStr + 'T12:00:00');
  const dem = new Date(demStr + 'T12:00:00');
  sal = parseFloat(sal);

  const semJusta = motivo === 'sem_justa_causa';
  const indenizado = semJusta && aviso === 'indenizado';
  const verbas = [];

  const totalDias = diffDays(adm, dem);
  const anosCompletos = Math.floor(totalDias / 365);

  // Aviso prévio: 30 dias + 3 por ano completo (máx 90)
  let diasAviso = 0;
  if (indenizado) diasAviso = Math.min(30 + 3 * anosCompletos, 90);

  // Projeção do contrato pelo aviso indenizado
  const fim = new Date(dem);
  fim.setDate(fim.getDate() + diasAviso);

  // 1. Saldo de salário
  const diasMes = dem.getDate();
  verbas.push({ n: 'Saldo de salário', d: diasMes + (diasMes === 1 ? ' dia trabalhado' : ' dias trabalhados') + ' no mês da demissão', v: (sal / 30) * diasMes });

  // 2. Aviso prévio
  if (indenizado) {
    verbas.push({ n: 'Aviso prévio indenizado', d: diasAviso + ' dias (30 + 3 por ano completo, limite de 90)', v: (sal / 30) * diasAviso });
  } else if (semJusta) {
    verbas.push({ n: 'Aviso prévio trabalhado', d: 'Pago junto com o salário do período trabalhado', v: 0, info: true });
  }

  // 3. 13º proporcional
  const inicio13 = adm > new Date(dem.getFullYear(), 0, 1) ? adm : new Date(dem.getFullYear(), 0, 1);
  const avos13 = mesesAvos(inicio13, fim);
  verbas.push({ n: '13º salário proporcional', d: avos13 + '/12 avos do ano' + (indenizado ? ' (com projeção do aviso)' : ''), v: (sal / 12) * avos13 });

  // 4. Férias proporcionais + 1/3
  let anosAq = 0, annivStart = new Date(adm);
  while (true) {
    const next = new Date(adm); next.setFullYear(adm.getFullYear() + anosAq + 1);
    if (next <= fim) { anosAq++; annivStart = next; } else break;
  }
  const avosFer = mesesAvos(annivStart, fim);
  const ferProp = (sal / 12) * avosFer;
  verbas.push({ n: 'Férias proporcionais + 1/3', d: avosFer + '/12 avos do período aquisitivo atual, com o terço constitucional', v: ferProp + ferProp / 3 });

  // 5. Férias vencidas + 1/3
  if (feriasVenc === 'sim') {
    verbas.push({ n: 'Férias vencidas + 1/3', d: '1 período completo não gozado, com o terço constitucional', v: sal + sal / 3 });
  }

  // 6. Multa de 40% do FGTS (estimativa) — só sem justa causa
  if (semJusta) {
    const mesesTot = mesesAvos(adm, fim);
    const depositoEstimado = sal * 0.08 * mesesTot;
    verbas.push({ n: 'Multa de 40% do FGTS', d: 'Estimativa sobre depósitos de ~' + mesesTot + ' meses (8% do salário). O valor exato depende do seu extrato do FGTS.', v: depositoEstimado * 0.4, est: true });
  }

  let nota = null;
  if (!semJusta) {
    nota = 'No pedido de demissão não há aviso prévio indenizado pela empresa nem multa de 40% do FGTS. Se o aviso não for cumprido, a empresa pode descontá-lo.';
  }

  const total = verbas.reduce((s, x) => s + x.v, 0);
  const meses = Math.round((totalDias % 365) / 30);
  return { verbas, total, nota, totalDias, anosCompletos, meses };
}

module.exports = { calcular };
