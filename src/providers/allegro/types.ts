// Allegro API response types
// Based on Allegro REST API: https://developer.allegro.pl/documentation

export interface AllegroCheckoutForm {
  id: string;
  buyer: {
    id: string;
    email: string;
    login: string;
    firstName?: string;
    lastName?: string;
  };
  lineItems: AllegroLineItem[];
  payment: {
    id: string;
    type: string;
    provider: string;
    finishedAt?: string;
    paidAmount: AllegroMoney;
    reconciliation: AllegroMoney;
  };
  delivery: {
    address?: {
      firstName: string;
      lastName: string;
      street: string;
      city: string;
      zipCode: string;
      countryCode: string;
    };
    method?: {
      id: string;
      name: string;
    };
    cost?: AllegroMoney;
    time?: {
      from: string;
      to: string;
    };
  };
  summary: {
    totalToPay: AllegroMoney;
  };
  updatedAt: string;
  status: string;
  fulfillment?: {
    status: string;
    shipmentSummary?: {
      lineItemsSent: string;
    };
  };
}

export interface AllegroLineItem {
  id: string;
  offer: {
    id: string;
    name: string;
    external?: {
      id?: string;
    };
  };
  quantity: number;
  originalPrice: AllegroMoney;
  price: AllegroMoney;
  boughtAt: string; // ISO 8601
}

export interface AllegroMoney {
  amount: string; // Decimal as string
  currency: string; // e.g., "PLN"
}

export interface AllegroCheckoutFormsResponse {
  checkoutForms: AllegroCheckoutForm[];
  count: number;
  totalCount: number;
}

export interface AllegroOfferDetails {
  id: string;
  name: string;
  category: {
    id: string;
  };
  images: Array<{
    url: string;
  }>;
}

export interface AllegroCategoryDetails {
  id: string;
  name: string;
  parent?: {
    id: string;
  };
}

export interface AllegroTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  jti: string;
}

/**
 * Response from POST /auth/oauth/device
 */
export interface AllegroDeviceCodeResponse {
  user_code: string;
  device_code: string;
  expires_in: number;
  interval: number;
  verification_uri: string;
  verification_uri_complete: string;
}

/**
 * Error body returned by the token endpoint during Device flow polling.
 */
export interface AllegroDeviceTokenError {
  error: string; // 'authorization_pending' | 'slow_down' | 'access_denied' | 'Invalid device code'
  error_description?: string;
}
