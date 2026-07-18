export interface OfferPricing {
  offerId: string;
  citizenId: string;
  establishmentId: string;
  wastePublicationId: string;
  pricePerUnit: number;
  unit: string;
  // Datos de presentación para la app
  wastePublicationTitle: string | null;
  wastePublicationPhotoUrl: string | null;
  citizenName: string | null;
  establishmentName: string | null;
}

export interface IOfferReadPort {
  getOfferPricing(offerId: string): Promise<OfferPricing | null>;
}
