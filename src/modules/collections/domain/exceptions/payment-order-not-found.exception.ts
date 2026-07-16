import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class PaymentOrderNotFoundException extends BaseException {
  readonly type = ErrorType.NOT_FOUND;

  constructor() {
    super('No existe una orden de pago para esta recolección. Crea la orden primero.');
  }
}
