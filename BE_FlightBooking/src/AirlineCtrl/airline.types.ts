export interface Airline {
  id: number;
  name: string;
  code: string;
  logo_url: string | null;
}

export interface CreateAirlineRequest {
  name: string;
  code: string;
  logo_url?: string;
}

export type UpdateAirlineRequest = Partial<CreateAirlineRequest>;
