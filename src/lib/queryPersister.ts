import { get, set, del } from 'idb-keyval';
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';

/**
 * Creates an IndexedDB persister for TanStack React Query.
 * This ensures full offline resilience: vehicle lists, routes, and student data
 * remain instantly accessible even when the network drops or the app is reloaded offline.
 */
export function createIdbPersister(idbKey: string = 'servisbot_query_cache'): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        console.warn('IndexedDB persister write error:', err);
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(idbKey);
      } catch (err) {
        console.warn('IndexedDB persister read error:', err);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(idbKey);
      } catch (err) {
        console.warn('IndexedDB persister delete error:', err);
      }
    },
  };
}
