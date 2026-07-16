import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class CollectionOwnershipException extends BaseException {
  readonly type = ErrorType.FORBIDDEN;

  constructor() {
    super('No tienes permiso para operar sobre esta recolección.');
  }
}
