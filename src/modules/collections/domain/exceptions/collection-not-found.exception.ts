import { BaseException } from '../../../../core/exceptions/base.exception';
import { ErrorType } from '../../../../core/exceptions/error-type.enum';

export class CollectionNotFoundException extends BaseException {
  readonly type = ErrorType.NOT_FOUND;

  constructor() {
    super('La recolección no existe.');
  }
}
