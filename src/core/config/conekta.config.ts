import { registerAs } from '@nestjs/config';

/**
 * Esquema mixto de llaves Conekta:
 *  - card / transfer (SPEI)  → llave LIVE  (cobros reales)
 *  - cash (OXXO)             → llave TEST  (sandbox)
 * `CONEKTA_PRIVATE_KEY` (legacy) sirve de fallback para ambas: si solo existe
 * esa variable, todo el servicio opera con una sola llave (modo anterior).
 */
export default registerAs('CONEKTA', () => {
  const live = process.env.CONEKTA_PRIVATE_KEY_LIVE ?? process.env.CONEKTA_PRIVATE_KEY;
  const test = process.env.CONEKTA_PRIVATE_KEY_TEST ?? process.env.CONEKTA_PRIVATE_KEY;

  return {
    KEY_BY_METHOD: {
      card: live,
      transfer: live,
      cash: test,
    } as Record<string, string | undefined>,
    API_BASE: process.env.CONEKTA_API_BASE,
    CURRENCY: process.env.CONEKTA_CURRENCY,
    FEE_RATE: process.env.TREASUREFLOW_FEE_RATE,
    PREMIUM_PRICE_MXN: process.env.PREMIUM_PRICE_MXN,
  };
});
