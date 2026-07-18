import { registerAs } from '@nestjs/config';

export default registerAs('CONEKTA', () => ({
  PRIVATE_KEY: process.env.CONEKTA_PRIVATE_KEY,
  API_BASE: process.env.CONEKTA_API_BASE,
  CURRENCY: process.env.CONEKTA_CURRENCY,
  FEE_RATE: process.env.TREASUREFLOW_FEE_RATE,
}));
