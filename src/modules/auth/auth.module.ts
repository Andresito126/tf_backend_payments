import { Module } from '@nestjs/common';

/// Módulo de auth vacío: desde que payments vive detrás del API Gateway, la
/// identidad llega en los headers `x-user-id`/`x-user-type` (ver
/// `GatewayAuthGuard`), así que ya no hay estrategia Passport ni validación de
/// JWT propia. Se mantiene el módulo porque `app.module.ts` y
/// `collections.module.ts` aún lo importan.
@Module({})
export class AuthModule {}
