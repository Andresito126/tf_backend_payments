import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class PaymentCaptureFailedException extends BaseException {
  readonly type = ErrorType.BUSINESS_RULE;

  constructor(issue: string) {
    super(`No se pudo capturar el pago en PayPal: ${issue}`);
  }
}
