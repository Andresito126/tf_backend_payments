import { PaymentCaptureFailedException } from '../../../domain/exceptions/payment-capture-failed.exception';
import type {
  CreateChargeInput,
  GatewayChargeResult,
} from '../../../application/ports/payment-gateway.port';

// Respuesta cruda de una orden de Conekta (solo los campos que usamos)
export interface ConektaOrderResponse {
  id: string;
  payment_status: string;
  charges?: {
    data: Array<{
      id: string;
      status: string;
      payment_method?: {
        type?: string;
        reference?: string; // OXXO
        barcode_url?: string; // OXXO
        clabe?: string; // SPEI
        receiving_account_number?: string; // SPEI
        expires_at?: number; // unix timestamp
      };
    }>;
  };
}

/**
 * Estrategia base de Conekta (equivalente a base.py del demo).
 * Lógica compartida: petición HTTP con Basic auth y normalización de la respuesta.
 */
export abstract class BaseConektaStrategy {
  constructor(
    protected readonly apiBase: string,
    private readonly privateKey: string,
  ) {}

  /** Cada estrategia arma el bloque payment_method de la orden. */
  protected abstract buildPaymentMethod(input: CreateChargeInput): Record<string, unknown>;

  async processPayment(input: CreateChargeInput): Promise<GatewayChargeResult> {
    const payload = {
      currency: input.currency,
      customer_info: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      line_items: [
        {
          name: input.description,
          unit_price: input.amountCents,
          quantity: 1,
        },
      ],
      charges: [
        {
          payment_method: this.buildPaymentMethod(input),
        },
      ],
    };

    const data = await this.sendConektaRequest('POST', '/orders', payload);
    return this.normalizeOrder(data);
  }

  protected async sendConektaRequest(
    method: string,
    path: string,
    payload?: object,
  ): Promise<ConektaOrderResponse> {
    const credentials = Buffer.from(`${this.privateKey}:`).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.apiBase}${path}`, {
        method,
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/vnd.conekta-v2.1.0+json',
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
    } catch (err) {
      throw new PaymentCaptureFailedException(
        `No se pudo conectar con Conekta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const details = (data.details as Array<{ message?: string; code?: string }> | undefined) ?? [];
      const detail = details[0]?.message ?? details[0]?.code ?? String(data.type ?? 'CONEKTA_ERROR');
      throw new PaymentCaptureFailedException(detail);
    }

    return data as unknown as ConektaOrderResponse;
  }

  protected normalizeOrder(order: ConektaOrderResponse): GatewayChargeResult {
    const charge = order.charges?.data?.[0];
    const pm = charge?.payment_method;

    let status: GatewayChargeResult['status'];
    if (order.payment_status === 'paid') {
      status = 'paid';
    } else if (order.payment_status === 'pending_payment') {
      status = 'pending_payment';
    } else {
      status = 'failed';
    }

    return {
      orderId: order.id,
      chargeId: charge?.id ?? null,
      status,
      reference: pm?.reference ?? pm?.clabe ?? pm?.receiving_account_number ?? null,
      barcodeUrl: pm?.barcode_url ?? null,
      expiresAt: pm?.expires_at ? new Date(pm.expires_at * 1000) : null,
    };
  }
}
