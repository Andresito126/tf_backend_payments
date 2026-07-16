import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class InvalidCollectionTransitionException extends BaseException {
  readonly type = ErrorType.BUSINESS_RULE;

  constructor(currentStatus: string, action: string) {
    super(
      `No se puede ejecutar '${action}' sobre una recolección en estado '${currentStatus}'.`,
    );
  }
}
