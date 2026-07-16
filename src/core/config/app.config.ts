import { registerAs } from '@nestjs/config';

export default registerAs('APP', () => ({
  environment: process.env.NODE_ENV,
  PORT_SERVER: process.env.PORT_SERVER,
}));
