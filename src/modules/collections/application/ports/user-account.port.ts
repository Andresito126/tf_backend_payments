export interface CustomerInfo {
  userId: string;
  name: string;
  email: string;
  phone: string;
}

export interface IUserAccountPort {
  // Datos desencriptados del usuario para el customer_info de Conekta
  getCustomerInfo(userId: string): Promise<CustomerInfo | null>;
}
