export interface Location {
  id: string;
  name: string;
  code: string;
  color: string;
  endpoint: string;
  isConnected: boolean;
}

export const LOCATIONS: Location[] = [
  { id: "syd", name: "Motus", code: "SYD", color: "hsl(206, 100%, 40%)", endpoint: "api.cartoncloud.com", isConnected: true },
  { id: "mel", name: "Peter Sadler", code: "MEL", color: "hsl(160, 84%, 39%)", endpoint: "api.cartoncloud.com", isConnected: true },
  { id: "bne", name: "Motus Brisbane", code: "BNE", color: "hsl(38, 92%, 50%)", endpoint: "api.cartoncloud.com", isConnected: true },
  { id: "per", name: "Chill", code: "PER", color: "hsl(258, 90%, 66%)", endpoint: "api.cartoncloud.com", isConnected: true },
];
