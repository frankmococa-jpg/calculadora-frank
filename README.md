# Calculadora de Rescisão GRÁTIS + Parecer R$97 — Frank Gonçalves

Modelo: a **calculadora é grátis** (roda no navegador). O **Parecer Detalhado (R$97)**
só libera a Análise Preliminar depois do pagamento **aprovado** no Mercado Pago.

## Estrutura
- `index.html` — a página (calculadora grátis + oferta + Análise Preliminar + PDF)
- `api/criar-pagamento.js` — cria o pagamento de R$97 (Checkout Pro) e devolve o link
- `api/status.js` — verifica se o pagamento foi aprovado (libera a Análise)
- `api/_calculo.js` — lógica de cálculo CLT (usada na conferência do servidor)
- `assets/` — logo e foto

## Configuração no Vercel (uma vez)
Variável de ambiente:
- **MP_ACCESS_TOKEN** = seu Access Token de PRODUÇÃO do Mercado Pago (começa com `APP_USR-`)

Mercado Pago → Suas integrações → sua aplicação → Credenciais de produção → Access Token.

## Como atualizar
1. Suba esta pasta no GitHub (substituindo os arquivos antigos).
2. No Vercel, o deploy é automático (ou clique em Redeploy).
3. No Wix, a página já está embutida pela URL `.vercel.app` — não precisa mexer.

## Fluxo
1. Pessoa preenche a calculadora → vê o resultado grátis na hora.
2. Clica em "Quero meu parecer" → abre o pagamento de R$97 (Pix/cartão) em nova aba.
3. Paga → o servidor confirma → a Análise Preliminar abre automaticamente (com PDF + WhatsApp).
