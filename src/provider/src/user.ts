export interface User {
  id: string; // required
  email: string; // required
  password: string; // required

  address?: {
    country?: string,
    formatted?: string,
    locality?: string,
    postal_code?: string,
    region?: string,
    street_address?: string,
  },
  birthdate?: string,
  email_verified: boolean,
  family_name?: string,
  gender?: string,
  given_name?: string,
  locale?: string,
  middle_name?: string,
  name: string,
  nickname?: string,
  phone_number?: string,
  phone_number_verified?: boolean,
  picture?: string,
  preferred_username?: string,
  profile?: string,
  updated_at?: number,
  website?: string,
  zoneinfo?: string,
  [key: string]: any; // for any additional custom claims
}