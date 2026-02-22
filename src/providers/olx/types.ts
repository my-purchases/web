// OLX Partner API response types
// Based on OLX Partner API v2.0: https://developer.olx.pl/api/doc

export interface OlxTokenResponse {
  access_token: string;
  expires_in: number; // seconds (typically 86400 = 24h)
  token_type: 'bearer';
  scope: string;
  refresh_token: string;
}

export interface OlxAdvert {
  id: number;
  status: string;
  url: string;
  created_at: string;
  activated_at?: string;
  valid_to?: string;
  title: string;
  description: string;
  category_id: number;
  advertiser_type: 'private' | 'business';
  external_id?: string;
  external_url?: string;
  contact?: {
    name?: string;
    phone?: string;
  };
  location?: {
    city_id?: number;
    district_id?: number;
    latitude?: number;
    longitude?: number;
  };
  images?: Array<{
    url: string;
  }>;
  price?: {
    value: number;
    currency: string;
    negotiable?: boolean;
    trade?: boolean;
    budget?: boolean;
  };
  salary?: {
    value_from?: number;
    value_to?: number;
    currency?: string;
    negotiable?: boolean;
    type?: string;
  };
  attributes?: Array<{
    code: string;
    value: string;
    values?: string[] | null;
  }>;
  courier?: boolean | null;
  ad_delivery?: {
    delivery_package_ids?: number[];
  };
  delivery_change_allowed?: boolean;
  auto_extend_enabled?: boolean;
}

export interface OlxAdvertsResponse {
  data: OlxAdvert[];
}

export interface OlxUser {
  id: number;
  email: string;
  status: string;
  name: string;
  phone?: number;
  phone_login?: number;
  created_at: string;
  last_login_at?: string;
  avatar?: string | null;
  is_business: boolean;
}

export interface OlxCategory {
  id: number;
  name: string;
  parent_id?: number;
  photos_limit?: number;
  is_leaf?: boolean;
}
