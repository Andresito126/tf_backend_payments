import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMqConnection } from '../../../../core/messaging/rabbitmq.connection';
import { CreateCollectionFromOfferUseCase } from '../../application/usecases/create-collection-from-offer.use-case';

const QUEUE = 'queue.payments.execute';
const EXCHANGE = 'payments.exchange';
const ROUTING_KEY = 'payments.execute';
const DLX = 'payments.dlx';
const DLQ = 'queue.payments.execute.dlq';
const TTL = 30_000;

@Injectable()
export class PaymentExecuteConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMqConnection: RabbitMqConnection,
    private readonly createCollectionUseCase: CreateCollectionFromOfferUseCase,
  ) {}

  onModuleInit() {
    this.rabbitMqConnection.createConsumerChannel(async (channel) => {
      await channel.assertExchange(DLX, 'direct', { durable: true });
      await channel.assertQueue(DLQ, { durable: true });
      await channel.bindQueue(DLQ, DLX, QUEUE);

      await channel.assertQueue(QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': DLX,
          'x-dead-letter-routing-key': QUEUE,
          'x-message-ttl': TTL,
        },
      });
      await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

      await channel.consume(QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString()) as {
            offerId: string;
            citizenId: string;
          };
          await this.createCollectionUseCase.execute({
            offerId: payload.offerId,
            citizenId: payload.citizenId,
          });
          channel.ack(msg);
        } catch (err) {
          console.error('[PaymentExecuteConsumer] Error procesando mensaje:', err instanceof Error ? err.message : String(err));
          channel.nack(msg, false, false);
        }
      });
    });
  }
}
