import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IFieldEncryptor } from '../ports/field-encryptor.port';

@Injectable()
export class AesFieldEncryptorAdapter implements IFieldEncryptor {
  private readonly encryptionKey: Buffer;
  private readonly hmacSecret: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey = Buffer.from(
      this.configService.get<string>('ENCRYPTION_KEY') as string,
      'hex',
    );
    this.hmacSecret = Buffer.from(
      this.configService.get<string>('HMAC_SECRET') as string,
      'hex',
    );
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(stored: string): string {
    try {
      const [ivHex, tagHex, ctHex] = stored.split(':');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(ctHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error('No se pudo descifrar el campo — el valor almacenado puede estar corrupto o la clave de cifrado cambió.');
    }
  }

  hmac(plain: string): string {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update(plain.toLowerCase())
      .digest('hex');
  }
}
