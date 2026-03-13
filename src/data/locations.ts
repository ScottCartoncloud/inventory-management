export interface Location {
  id: string;
  name: string;
  code: string;
  color: string;
  endpoint: string;
  isConnected: boolean;
}

export const LOCATIONS: Location[] = [];
