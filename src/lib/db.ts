import Dexie, { type Table } from 'dexie';
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

export class OQDatabase extends Dexie {
  cards!: Table<CardRow>;
  sync_queue!: Table<SyncLog>;
  favorites!: Table<CardRow>;
  session_state!: Table<SessionState>;

  constructor() {
    super('OQDatabase');
    this.version(1).stores({
      cards: 'id, especialidade, modo',
      sync_queue: '++id, synced, timestamp',
      favorites: 'id, especialidade',
      session_state: 'id'
    });
  }
}

export const db = new OQDatabase();
