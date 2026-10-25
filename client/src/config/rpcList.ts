export interface RpcEndpoint {
  id: string;
  name: string;
  url: string;
  isWs?: boolean;
  recommended?: boolean;
}

export const MONAD_RPC_LIST: RpcEndpoint[] = [
  {
    id: 'official',
    name: 'Monad Official RPC',
    url: 'https://testnet-rpc.monad.xyz',
    recommended: true
  },
  {
    id: 'ankr',
    name: 'Ankr Public RPC',
    url: 'https://rpc.ankr.com/monad_testnet'
  },
  {
    id: 'monadinfra',
    name: 'Monad Infra RPC',
    url: 'https://rpc-testnet.monadinfra.com'
  },
  {
    id: 'tatum',
    name: 'Tatum Gateway',
    url: 'https://monad-testnet.gateway.tatum.io'
  },
  {
    id: 'drpc',
    name: 'dRPC Endpoint',
    url: 'https://monad-testnet.drpc.org'
  },
  {
    id: 'routeme',
    name: 'RouteMe EVM 10143',
    url: 'https://lb.routeme.sh/rpc/evm/10143'
  },
  {
    id: 'huginn',
    name: 'Huginn Tech RPC',
    url: 'https://monad-testnet-rpc.huginn.tech'
  },
  {
    id: 'onfinality',
    name: 'OnFinality Public',
    url: 'https://monad-testnet.api.onfinality.io/public'
  }
];
