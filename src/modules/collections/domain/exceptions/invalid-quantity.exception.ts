import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class InvalidQuantityException extends BaseException {
  readonly type = ErrorType.BUSINESS_RULE;

  constructor() {
    super('La cantidad pesada debe ser mayor a cero.');
  }
}
