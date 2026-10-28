export type AuthMode = 'none' | 'google' | 'metamask_session' | 'private_key' | 'metamask_direct';

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
  secondsWeight?: number;
  crowdCount?: number;
  lastOccupantId?: number;
}

export interface PlayerData {
  x: number;
  y: number;
  exists: boolean;
  sessionKey?: string;
  sessionExpiry?: number;
  registeredAtBlock?: number;
  registeredAtTimestamp?: number;
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
