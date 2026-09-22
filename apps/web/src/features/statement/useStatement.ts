import { useCallback, useEffect, useState } from 'react';
import { useWalletApi } from '../../api/WalletApiContext';
import type { Statement } from '../../api/wallet-api';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; statement: Statement };

export function useStatement() {
  const api = useWalletApi();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', statement: await api.getStatement() });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Failed to load' });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
