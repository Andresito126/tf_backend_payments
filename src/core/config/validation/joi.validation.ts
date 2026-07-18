import Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),

  // server
  PORT_SERVER: Joi.number().port().default(3003),

  // auth (mismo secret que tf_backend_main — solo validación de tokens)
  JWT_ACCESS_SECRET: Joi.string().required(),

  // rabbitmq
  RABBITMQ_URL: Joi.string().required(),

  // encryption (compartida con tf_backend_main)
  ENCRYPTION_KEY: Joi.string().length(64).required(),
  HMAC_SECRET: Joi.string().length(64).required(),

  // conekta
  CONEKTA_PRIVATE_KEY: Joi.string().required(),
  CONEKTA_API_BASE: Joi.string().uri().default('https://api.conekta.io'),
  CONEKTA_CURRENCY: Joi.string().length(3).default('MXN'),
  TREASUREFLOW_FEE_RATE: Joi.number().min(0).max(1).default(0.05),
});
