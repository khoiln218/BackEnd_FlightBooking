export interface Airport {
  id: number;
  name: string;
  code: string;
  city: string;
  country: string;
}

export interface CreateAirportRequest {
  name: string;
  code: string;
  city: string;
  country: string;
}

export type UpdateAirportRequest = Partial<CreateAirportRequest>;
