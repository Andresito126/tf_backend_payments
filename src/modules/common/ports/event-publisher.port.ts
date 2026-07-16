export interface IEventPublisher {
  publish(exchange: string, routingKey: string, payload: object): Promise<void>;
}
