import { createContext, useContext, type ReactNode } from 'react';
import type { WalletApi } from './wallet-api';

const WalletApiContext = createContext<WalletApi | null>(null);

export function WalletApiProvider({ api, children }: { api: WalletApi; children: ReactNode }) {
  return <WalletApiContext.Provider value={api}>{children}</WalletApiContext.Provider>;
}

export function useWalletApi(): WalletApi {
  const api = useContext(WalletApiContext);
  if (!api) throw new Error('useWalletApi must be used within WalletApiProvider');
  return api;
}
