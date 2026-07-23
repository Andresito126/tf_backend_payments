export interface PremiumUserStatus {
  isPremiumFlag: boolean;
  premiumExpiresAt: Date | null;
}

export interface IPremiumUserRepository {
  getStatus(userId: string): Promise<PremiumUserStatus | null>;
  /**
   * Activa (o extiende) el premium 30 días. Si ya estaba vigente, los días
   * se suman a lo que le queda. Devuelve la nueva fecha de expiración.
   */
  activatePremium(userId: string): Promise<Date>;
}
