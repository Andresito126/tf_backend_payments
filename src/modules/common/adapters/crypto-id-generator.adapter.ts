import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IIdGenerator } from '../ports/id-generator.port';

@Injectable()
export class CryptoIdGeneratorAdapter implements IIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
