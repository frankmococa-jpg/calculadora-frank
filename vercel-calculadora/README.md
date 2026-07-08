# Calculadora de Verbas Rescisórias — Frank Gonçalves

Sistema com pagamento PIX (Mercado Pago) e cálculo protegido no servidor.
O cálculo só é liberado após a confirmação do pagamento.

## Estrutura
- `index.html` — a página (frontend)
- `api/criar-pagamento.js` — cria a cobrança PIX no Mercado Pago
- `api/status.js` — verifica o pagamento e libera o cálculo
- `api/_calculo.js` — a lógica de cálculo (roda só no servidor)
- `assets/` — logo e foto

## Configuração no Vercel
Defina UMA variável de ambiente:
- **MP_ACCESS_TOKEN** = seu Access Token de PRODUÇÃO do Mercado Pago

(Mercado Pago → Seus negócios → Configurações → Credenciais de produção → Access Token)

Sem essa variável, o pagamento não funciona.

## Como o dinheiro cai
Direto na sua conta do Mercado Pago (é a sua credencial que gera as cobranças).
