import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettlePaymentUseCase } from '../../application/usecases/settle-payment.use-case';

interface ConektaWebhookEvent {
  type?: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
    };
  };
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly settlePaymentUseCase: SettlePaymentUseCase) {}

  @Post('conekta')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de Conekta (order.paid)',
    description: 'Conekta notifica aquí cuando una orden OXXO/SPEI fue pagada. Idempotente.',
  })
  async handleConektaEvent(@Body() event: ConektaWebhookEvent) {
    const orderId = event?.data?.object?.id;

    if (event?.type === 'order.paid' && orderId) {
      try {
        await this.settlePaymentUseCase.executeByGatewayOrderId(orderId);
      } catch (err) {
        // Siempre responder 200 para que Conekta no reintente indefinidamente;
        // el polling de estado sirve como respaldo.
        console.error('[ConektaWebhook] Error liquidando pago:', err instanceof Error ? err.message : String(err));
      }
    }

    return { received: true };
  }
}
