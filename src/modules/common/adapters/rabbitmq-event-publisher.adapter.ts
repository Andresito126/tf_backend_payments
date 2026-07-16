import { Injectable } from '@nestjs/common';
import { RabbitMqConnection } from '../../../core/messaging/rabbitmq.connection';
import type { IEventPublisher } from '../ports/event-publisher.port';

@Injectable()
export class RabbitMqEventPublisherAdapter implements IEventPublisher {
  constructor(private readonly connection: RabbitMqConnection) {}

  async publish(exchange: string, routingKey: string, payload: object): Promise<void> {
    await this.connection.publish(exchange, routingKey, payload);
  }
}
