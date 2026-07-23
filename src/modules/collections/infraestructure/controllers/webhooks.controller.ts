import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcessGatewayEventUseCase } from '../../application/usecases/process-gateway-event.use-case';

interface ConektaWebhookEvent {
  type?: string;
  data?: {
    object?: {
      id?: string;
      order_id?: string;
      payment_status?: string;
    };
  };
}

/** Eventos que disparan una re-verificación del estado de la orden. */
const HANDLED_EVENTS = new Set([
  'order.paid',
  'order.expired',
  'order.canceled',
  'charge.declined',
]);

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly processGatewayEvent: ProcessGatewayEventUseCase) {}

  @Post('conekta')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de Conekta (order.paid / order.expired / charge.declined)',
    description:
      'No confía en el payload: re-consulta el estado real de la orden a la API de ' +
      'Conekta antes de liberar o marcar fallido. Idempotente.',
  })
  async handleConektaEvent(@Body() event: ConektaWebhookEvent) {
    // En eventos de charge el objeto es un charge (order_id apunta a la orden);
    // en eventos de order el objeto ES la orden (id).
    const obj = event?.data?.object;
    const orderId = obj?.order_id ?? obj?.id;

    if (event?.type && HANDLED_EVENTS.has(event.type) && orderId) {
      try {
        await this.processGatewayEvent.execute(orderId);
      } catch (err) {
        // Siempre responder 200 para que Conekta no reintente indefinidamente;
        // el polling de estado sirve como respaldo.
        console.error(
          '[ConektaWebhook] Error procesando evento:',
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    return { received: true };
  }
}
