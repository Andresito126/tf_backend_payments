import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  CreateChargeInput,
  GatewayChargeResult,
  GatewayOrderStatus,
} from '../../application/ports/payment-gateway.port';
import type { PaymentMethod } from '../../domain/entities/payment.entity';
import { PaymentCaptureFailedException } from '../../domain/exceptions/payment-capture-failed.exception';
import { BaseConektaStrategy, ConektaOrderResponse } from './strategies/base-conekta.strategy';
import { CardPaymentStrategy } from './strategies/card.strategy';
import { CashPaymentStrategy } from './strategies/cash.strategy';
import { TransferPaymentStrategy } from './strategies/transfer.strategy';

/**
 * Gateway de pagos Conekta (equivalente a service.py del demo).
 * Patrón Strategy: resuelve dinámicamente el método de pago solicitado.
 *
 * Esquema mixto de llaves: cada strategy se construye con la llave de SU
 * entorno (card/transfer → LIVE para cobros reales, cash/OXXO → TEST sandbox).
 * La decisión método→llave vive en CONEKTA.KEY_BY_METHOD (conekta.config.ts).
 */
@Injectable()
export class ConektaGatewayAdapter implements IPaymentGateway {
  private readonly strategies: Record<string, BaseConektaStrategy>;
  private readonly apiBase: string;
  private readonly keyByMethod: Record<string, string>;

  constructor(configService: ConfigService) {
    this.apiBase = configService.get<string>('CONEKTA.API_BASE')!;
    this.keyByMethod = configService.get<Record<string, string>>('CONEKTA.KEY_BY_METHOD')!;

    this.strategies = {
      card: new CardPaymentStrategy(this.apiBase, this.keyByMethod.card),
      cash: new CashPaymentStrategy(this.apiBase, this.keyByMethod.cash),
      transfer: new TransferPaymentStrategy(this.apiBase, this.keyByMethod.transfer),
    };
  }

  async createCharge(input: CreateChargeInput): Promise<GatewayChargeResult> {
    const strategy = this.strategies[input.method];
    if (!strategy) {
      throw new PaymentCaptureFailedException(
        `Método de pago '${input.method}' no soportado. Válidos: card, cash, transfer.`,
      );
    }
    return strategy.processPayment(input);
  }

  async getOrderStatus(orderId: string, method: PaymentMethod): Promise<GatewayOrderStatus> {
    const privateKey = this.keyByMethod[method];
    if (!privateKey) {
      throw new PaymentCaptureFailedException(
        `Método de pago '${method}' sin llave Conekta configurada.`,
      );
    }
    const credentials = Buffer.from(`${privateKey}:`).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.apiBase}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/vnd.conekta-v2.1.0+json',
        },
      });
    } catch (err) {
      throw new PaymentCaptureFailedException(
        `No se pudo conectar con Conekta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const details = (data.details as Array<{ message?: string }> | undefined) ?? [];
      throw new PaymentCaptureFailedException(details[0]?.message ?? 'CONEKTA_ERROR');
    }

    const order = data as unknown as ConektaOrderResponse;
    const chargeId = order.charges?.data?.[0]?.id ?? null;

    const known = ['paid', 'pending_payment', 'expired', 'declined'];
    const status = known.includes(order.payment_status)
      ? (order.payment_status as GatewayOrderStatus['status'])
      : 'unknown';

    return { status, chargeId };
  }
}
