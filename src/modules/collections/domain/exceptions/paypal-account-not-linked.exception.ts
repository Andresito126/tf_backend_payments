import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class PaypalAccountNotLinkedException extends BaseException {
  readonly type = ErrorType.BUSINESS_RULE;

  constructor() {
    super('El ciudadano aún no ha vinculado su cuenta de PayPal.');
  }
}
