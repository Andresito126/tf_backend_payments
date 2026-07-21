import { Injectable } from '@nestjs/common';
import { PostgreSQl } from '../../../../core/database/postgresql.connection';
import { IUserAccountPort, CustomerInfo } from '../../application/ports/user-account.port';
import type { IFieldEncryptor } from '../../../common/ports/field-encryptor.port';

@Injectable()
export class PostgresUserAccountAdapter implements IUserAccountPort {
  constructor(
    private readonly db: PostgreSQl,
    private readonly encryptor: IFieldEncryptor,
  ) {}

  async getCustomerInfo(userId: string): Promise<CustomerInfo | null> {
    const result = await this.db.query(
      `SELECT
         u.id,
         u.user_type,
         u.email,
         u.phone,
         e.store_name,
         c.first_name,
         c.paternal_last_name
       FROM users u
       LEFT JOIN establishments e ON e.user_id = u.id
       LEFT JOIN citizens c ON c.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];

    const name =
      row.user_type === 'establishment'
        ? (row.store_name as string)
        : `${this.safeDecrypt(row.first_name)} ${this.safeDecrypt(row.paternal_last_name)}`.trim();

    return {
      userId: row.id as string,
      name: this.sanitizeNameForConekta(name) || 'Usuario TreasureFlow',
      email: this.safeDecrypt(row.email) || 'sin-email@treasureflow.mx',
      phone: this.safeDecrypt(row.phone) || '+525555555555',
    };
  }

  private safeDecrypt(value: string | null): string {
    if (!value) return '';
    try {
      return this.encryptor.decrypt(value);
    } catch {
      return '';
    }
  }

  /**
   * Conekta valida `customer_info.name` como si fuera un nombre de persona
   * (solo letras y espacios) — un negocio real con número en el nombre
   * ("Recicladora 24", "Chatarrería No. 3") lo rechaza con "Formato inválido".
   * Quitamos dígitos/símbolos solo para este campo; el store_name real no se toca.
   */
  private sanitizeNameForConekta(name: string | null): string {
    if (!name) return '';
    return name
      .replace(/[^\p{L}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
