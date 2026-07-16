export interface IFieldEncryptor {
  encrypt(plain: string): string;
  decrypt(cipher: string): string;
  hmac(plain: string): string;
}
