import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import type { ChannelWrapper } from 'amqp-connection-manager';

@Injectable()
export class RabbitMqConnection implements OnModuleDestroy {
  private readonly connection: amqp.AmqpConnectionManager;
  private readonly channelWrapper: ChannelWrapper;

  constructor(private readonly configService: ConfigService) {
    this.connection = amqp.connect([
      this.configService.get<string>('RABBITMQ.URL') as string,
    ]);

    this.connection.on('error', (err) => console.error('[RabbitMQ] Connection error:', err instanceof Error ? err.message : String(err)));
    this.connection.on('disconnect', (params) => console.error('[RabbitMQ] Disconnected:', params?.err instanceof Error ? params.err.message : String(params?.err ?? '')));

    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: amqp.Channel) => {
        await channel.assertExchange('payments.exchange', 'topic', { durable: true });
        await channel.assertExchange('notifications', 'direct', { durable: true });
      },
    });
  }

  async publish(exchange: string, routingKey: string, payload: object): Promise<void> {
    await this.channelWrapper.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
    );
  }

  createConsumerChannel(setup: (ch: amqp.Channel) => Promise<void>): ChannelWrapper {
    return this.connection.createChannel({ setup });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper.close();
    await this.connection.close();
  }
}
