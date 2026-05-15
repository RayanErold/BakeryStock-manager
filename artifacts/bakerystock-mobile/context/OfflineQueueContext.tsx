import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createStockMovement } from "@workspace/api-client-react";

export interface QueuedMovement {
  id: string;
  itemId: number;
  branchId: number;
  type: "stock_in" | "used_in_production" | "sold" | "damaged" | "missing_lost" | "returned";
  quantity: number;
  note?: string;
  queuedAt: string;
}

interface OfflineQueueContextType {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  queueMovement: (m: Omit<QueuedMovement, "id" | "queuedAt">) => Promise<void>;
  syncNow: () => Promise<void>;
}

const QUEUE_KEY = "offline_movement_queue";
const LAST_SYNCED_KEY = "offline_last_synced";

const OfflineQueueContext = createContext<OfflineQueueContextType>({
  isOnline: true,
  pendingCount: 0,
  lastSyncedAt: null,
  isSyncing: false,
  queueMovement: async () => {},
  syncNow: async () => {},
});

async function loadQueue(): Promise<QueuedMovement[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMovement[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedMovement[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNCED_KEY).then((val) => {
      if (val) setLastSyncedAt(new Date(val));
    });
    loadQueue().then((q) => setPendingCount(q.length));
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = await loadQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const remaining: QueuedMovement[] = [];
    for (const item of queue) {
      try {
        await createStockMovement({
          itemId: item.itemId,
          branchId: item.branchId,
          type: item.type,
          quantity: item.quantity,
          note: item.note,
        });
      } catch {
        remaining.push(item);
      }
    }

    await saveQueue(remaining);
    setPendingCount(remaining.length);

    if (remaining.length < queue.length) {
      const now = new Date();
      await AsyncStorage.setItem(LAST_SYNCED_KEY, now.toISOString());
      setLastSyncedAt(now);
    }

    syncingRef.current = false;
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        syncNow();
      }
    });
    return unsubscribe;
  }, [syncNow]);

  const queueMovement = useCallback(
    async (m: Omit<QueuedMovement, "id" | "queuedAt">) => {
      const queue = await loadQueue();
      const entry: QueuedMovement = {
        ...m,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        queuedAt: new Date().toISOString(),
      };
      const next = [...queue, entry];
      await saveQueue(next);
      setPendingCount(next.length);
    },
    []
  );

  return (
    <OfflineQueueContext.Provider
      value={{ isOnline, pendingCount, lastSyncedAt, isSyncing, queueMovement, syncNow }}
    >
      {children}
    </OfflineQueueContext.Provider>
  );
}

export function useOfflineQueue() {
  return useContext(OfflineQueueContext);
}
