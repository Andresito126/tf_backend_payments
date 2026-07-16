import { ErrorType } from './error-type.enum';

export abstract class BaseException extends Error {
  abstract readonly type: ErrorType;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
