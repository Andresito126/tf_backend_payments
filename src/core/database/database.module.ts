import { Module, Global } from '@nestjs/common';
import { PostgreSQl } from './postgresql.connection';

@Global()
@Module({
  providers: [PostgreSQl],
  exports: [PostgreSQl],
})
export class DatabaseModule {}
