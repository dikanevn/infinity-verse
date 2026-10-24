export interface CellData {
  x: number;
  y: number;
  key: string;
  terrain: number;
  object: number;
  state: number;
  reserved: number;
  paramA: number;
  paramB: number;
}

export interface PlayerData {
  x: number;
  y: number;
  exists: boolean;
}

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export interface GoogleSessionData {
  idToken: string;
  email?: string;
  address: `0x${string}`;
}

