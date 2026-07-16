import { registerAs } from '@nestjs/config';

export default registerAs('PAYPAL', () => ({
  CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  API_BASE: process.env.PAYPAL_API_BASE,
  CURRENCY: process.env.PAYPAL_CURRENCY,
  FEE_RATE: process.env.TREASUREFLOW_FEE_RATE,
}));
