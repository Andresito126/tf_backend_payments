import { Global, Module } from '@nestjs/common';
import { CryptoIdGeneratorAdapter } from './adapters/crypto-id-generator.adapter';
import { RabbitMqEventPublisherAdapter } from './adapters/rabbitmq-event-publisher.adapter';
import { AesFieldEncryptorAdapter } from './adapters/aes-field-encryptor.adapter';

@Global()
@Module({
  providers: [
    { provide: 'IIdGenerator', useClass: CryptoIdGeneratorAdapter },
    { provide: 'IEventPublisher', useClass: RabbitMqEventPublisherAdapter },
    { provide: 'IFieldEncryptor', useClass: AesFieldEncryptorAdapter },
  ],
  exports: ['IIdGenerator', 'IEventPublisher', 'IFieldEncryptor'],
})
export class CommonModule {}
