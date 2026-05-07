import Dexie, { type EntityTable } from 'dexie';
import { CardRow } from './oq';

export interface SyncLog {
  id?: number;
  userId: string;
  cardId: string;
  acertou: boolean;
  nivelPista: number;
  nota: number;
  pesoImportancia: number;
  timestamp: string;
  synced: number; // 0 ou 1
}

export interface SessionState {
  id: string; // 'current'
  pool: CardRow[];
  idx: number;
  filtro: any;
  timestamp: number;
}

// @ts-ignore - Dexie might have typing issues in this environment
const db = new Dexie('OQDatabase') as Dexie & {
  cards: EntityTable<CardRow, 'id'>;
  sync_queue: EntityTable<SyncLog, 'id'>;
  favorites: EntityTable<CardRow, 'id'>;
  session_state: EntityTable<SessionState, 'id'>;
};

db.version(1).stores({
  cards: 'id, especialidade, modo',
  sync_queue: '++id, synced, timestamp',
  favorites: 'id, especialidade',
  session_state: 'id'
});

export { db };
