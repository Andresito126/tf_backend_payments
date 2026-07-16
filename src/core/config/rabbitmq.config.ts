import { registerAs } from '@nestjs/config';

export default registerAs('RABBITMQ', () => ({
  URL: process.env.RABBITMQ_URL,
}));
