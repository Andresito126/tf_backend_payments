import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import authConfig from './core/config/auth.config';
import rabbitmqConfig from './core/config/rabbitmq.config';
import conektaConfig from './core/config/conekta.config';
import joiValidation from './core/config/validation/joi.validation';
import { DatabaseModule } from './core/database/database.module';
import { MessagingModule } from './core/messaging/messaging.module';
import { CommonModule } from './modules/common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { PremiumModule } from './modules/premium/premium.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.development.env',
      load: [appConfig, databaseConfig, authConfig, rabbitmqConfig, conektaConfig],
      validationSchema: joiValidation,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    MessagingModule,
    CommonModule,
    AuthModule,
    PremiumModule,
    CollectionsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
