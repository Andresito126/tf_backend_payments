import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, Result } from 'pg';

@Injectable()
export class PostgreSQl implements OnModuleDestroy {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DATABASE.DB_HOST'),
      user: this.configService.get<string>('DATABASE.DB_USER'),
      password: this.configService.get<string>('DATABASE.DB_PASSWORD'),
      database: this.configService.get<string>('DATABASE.DB_NAME'),
      port: this.configService.get<number>('DATABASE.DB_PORT'),
      max: 10,
      ssl: { rejectUnauthorized: false },
    });

    this.pool.on('error', (err) => console.error('[pg] Unexpected pool error:', err instanceof Error ? err.message : String(err)));
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async query(text: string, values?: any[]): Promise<Result> {
    return this.pool.query(text, values);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
