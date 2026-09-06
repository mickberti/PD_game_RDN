import { inject, Injectable, signal } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  docData,
  writeBatch,
  collectionData,
  serverTimestamp,
  query,
  QueryDocumentSnapshot,
  where,
  orderBy,
  limit,
  QueryConstraint
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { LoggerService } from '../infrastructure/logging/logger.service';
import { TimeService } from '../utils/time.service';
import { RemoteConfigDocument } from '../../models/remote/config.model';
import { GameEvent } from '../../models/remote/event.model';
import { AdminLog } from '../../models/remote/admin-log.model';
import { MOCK_REMOTE_CONFIG } from '../../models/mock/remote-config.mock';
import { fantasyAwards } from '../../models/mock/fantasy/awards-data';



export type FirebaseWhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

export interface FirestoreWhereFilter {
  field: string;
  op: FirebaseWhereFilterOp;
  value: unknown;
}


export type FirestoreSeedTarget =
  | 'catalogAwards'
  | 'events'
  | 'gameConfigs/public';

export const FIRESTORE_SEED_TARGETS: readonly FirestoreSeedTarget[] = [
  'catalogAwards',
  'events',
  'gameConfigs/public'
];

export interface FirestoreSeedResult {
  collections: Record<string, number>;
  documents: Record<string, number>;
  deleted: Record<string, number>;
  totalDeletes: number;
  totalWrites: number;
}

export interface FirestoreSeedPreview {
  target: FirestoreSeedTarget;
  path: string;
  type: 'collection' | 'document';
  count: number;
  data: unknown;
}

export interface FirestoreCollectionQueryOptions {
  where?: FirestoreWhereFilter[];
  orderBy?: {
    field: string;
    direction?: 'asc' | 'desc';
  };
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class FirestoreAdminService {
  private readonly firestore = inject(Firestore);
  private readonly logger = inject(LoggerService);
  private readonly timeService = inject(TimeService);

  collections = signal<string[]>([]);

  async getCollection(collectionName: string) {
	this.logger.logDebug('[FirestoreAdminService] getCollection from path:', collectionName);
    const ref = collection(this.firestore, collectionName);
    const snap = await getDocs(ref);
	this.logger.logDebug('[FirestoreAdminService] getCollection OK :', snap);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }


  async runCollectionQuery(collectionName: string, options: FirestoreCollectionQueryOptions = {}) {
	this.logger.logDebug('[FirestoreAdminService] runCollectionQuery from path:', collectionName, options);
    const ref = collection(this.firestore, collectionName);
    const constraints: QueryConstraint[] = [];

    for (const clause of options.where ?? []) {
      constraints.push(where(clause.field, clause.op, clause.value));
    }

    if (options.orderBy?.field) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction ?? 'asc'));
    }

    if (typeof options.limit === 'number' && options.limit > 0) {
      constraints.push(limit(options.limit));
    }

    const builtQuery = constraints.length > 0 ? query(ref, ...constraints) : query(ref);
    const snap = await getDocs(builtQuery);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async getDocument(path: string) {
	this.logger.logDebug('[FirestoreAdminService] getDocument from path:', path);
    const ref = doc(this.firestore, path);
    const snap = await getDoc(ref);
	this.logger.logDebug('[FirestoreAdminService] getDocument OK :', snap);
    return snap.exists() ? snap.data() : null;
  }

  watchDocument<T>(path: string): Observable<T | undefined> {
	this.logger.logDebug('[FirestoreAdminService] watchDocument from path:', path);
    const ref = doc(this.firestore, path);
	this.logger.logDebug('[FirestoreAdminService] watchDocument ref created:', ref);
    return docData(ref) as Observable<T | undefined>;
  }
  
  async saveDocument(path: string, data: any) {
	this.logger.logDebug('[FirestoreAdminService] saveDocument to path:', path, 'with data:', data);
    const ref = doc(this.firestore, path);
	this.logger.logDebug('[FirestoreAdminService] saveDocument ref created:', ref);
    return setDoc(ref, data, { merge: true });
  }
  
  async replaceDocument(path: string, data: unknown): Promise<void> {
	this.logger.logDebug('[FirestoreAdminService] replaceDocument to path:', path, 'with data:', data);
    const ref = doc(this.firestore, path);
	this.logger.logDebug('[FirestoreAdminService] replaceDocument ref created:', ref);
    await setDoc(ref, data);
  }

  async updateDocument(path: string, data: any) {
	this.logger.logDebug('[FirestoreAdminService] updateDocument to path:', path, 'with data:', data);
    const ref = doc(this.firestore, path);
	this.logger.logDebug('[FirestoreAdminService] updateDocument ref created:', ref);
    return updateDoc(ref, data);
  }

  async deleteDocument(path: string) {
	this.logger.logDebug('[FirestoreAdminService] deleteDocument from path:', path);
    const ref = doc(this.firestore, path);
	this.logger.logDebug('[FirestoreAdminService] deleteDocument ref created:', ref);
    return deleteDoc(ref);
  }
  
  async saveRemoteConfig(config: RemoteConfigDocument): Promise<void> {
    const ref = doc(this.firestore, 'gameConfigs/public');
    await setDoc(ref, config, { merge: false });
  }

  async saveGameEvents(events: GameEvent[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    for (const event of events) {
      const eventRef = doc(this.firestore, `events/${event.id}`);
      batch.set(eventRef, event);
    }

    await batch.commit();
  }

  async deleteGameEvent(eventId: string): Promise<void> {
    const ref = doc(this.firestore, `events/${eventId}`);
    await deleteDoc(ref);
  }


  getSeedPreview(target: FirestoreSeedTarget): FirestoreSeedPreview {
    const seed = this.getSeedData(target);
    const data = this.toFirestoreSeedData(seed.data);

    return {
      target,
      path: target,
      type: seed.type,
      count: Array.isArray(data) ? data.length : 1,
      data
    };
  }

  async seedMockDatabase(targets: readonly FirestoreSeedTarget[] = FIRESTORE_SEED_TARGETS): Promise<FirestoreSeedResult> {
    this.logger.logDebug('[FirestoreAdminService] seedMockDatabase start', targets);

    const result: FirestoreSeedResult = {
      collections: {},
      documents: {},
      deleted: {},
      totalDeletes: 0,
      totalWrites: 0
    };
    const selectedTargets = new Set(targets);

    for (const target of FIRESTORE_SEED_TARGETS) {
      if (!selectedTargets.has(target)) {
        continue;
      }

      const seed = this.getSeedData(target);

      await this.deleteSeedTarget(target, result);

      if (seed.type === 'collection') {
        await this.writeCollectionSeed(target, seed.data as { id: string }[], result);
      } else {
        await this.writeDocumentSeed(target, seed.data, result);
      }
    }

    this.logger.logDebug('[FirestoreAdminService] seedMockDatabase complete', result);
    return result;
  }

  private getSeedData(target: FirestoreSeedTarget): { type: 'collection' | 'document'; data: unknown } {
    switch (target) {
      case 'catalogAwards':
        return { type: 'collection', data: fantasyAwards };
      case 'gameConfigs/public':
        return { type: 'document', data: MOCK_REMOTE_CONFIG };
    }
    throw new Error(`Seed target non supportato: ${target}`);
  }

  async deleteSeedTarget(target: FirestoreSeedTarget, result?: FirestoreSeedResult): Promise<number> {
    const seed = this.getSeedData(target);
    const deletedCount = seed.type === 'collection'
      ? await this.deleteCollectionDocuments(target)
      : await this.deleteSingleDocument(target);

    if (result) {
      result.deleted[target] = deletedCount;
      result.totalDeletes += deletedCount;
    }

    return deletedCount;
  }

  private async deleteCollectionDocuments(collectionName: string): Promise<number> {
    const chunkSize = 450;
    let deletedCount = 0;

    while (true) {
      const ref = collection(this.firestore, collectionName);
      const snap = await getDocs(query(ref, limit(chunkSize)));

      if (snap.empty) {
        break;
      }

      await this.deleteDocumentSnapshots(snap.docs);
      deletedCount += snap.size;
    }

    return deletedCount;
  }

  private async deleteDocumentSnapshots(docs: QueryDocumentSnapshot[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    for (const snapshot of docs) {
      batch.delete(snapshot.ref);
    }

    await batch.commit();
  }

  private async deleteSingleDocument(path: string): Promise<number> {
    const ref = doc(this.firestore, path);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return 0;
    }

    await deleteDoc(ref);
    return 1;
  }

  private async writeCollectionSeed<T extends { id: string }>(
    collectionName: string,
    items: T[],
    result: FirestoreSeedResult
  ): Promise<void> {
    const chunkSize = 450;

    for (let start = 0; start < items.length; start += chunkSize) {
      const batch = writeBatch(this.firestore);
      const chunk = items.slice(start, start + chunkSize);

      for (const item of chunk) {
        const ref = doc(this.firestore, `${collectionName}/${item.id}`);
        batch.set(ref, this.toFirestoreSeedData(item));
      }

      await batch.commit();
    }

    result.collections[collectionName] = items.length;
    result.totalWrites += items.length;
  }

  private async writeDocumentSeed(
    path: string,
    data: unknown,
    result: FirestoreSeedResult
  ): Promise<void> {
    const ref = doc(this.firestore, path);
    await setDoc(ref, this.toFirestoreSeedData(data) as Record<string, unknown>);

    result.documents[path] = 1;
    result.totalWrites += 1;
  }

  private toFirestoreSeedData<T>(data: T): T {
    return JSON.parse(JSON.stringify(data)) as T;
  }

  async writeAdminLog(entry: AdminLog): Promise<void> {
    const logId = `admin_${this.timeService.now()}`;
    const ref = doc(this.firestore, `adminLogs/${logId}`);

    await setDoc(ref, {
      ...entry,
      createdAt: serverTimestamp()
    });
  }

  watchLiveEvents(): Observable<GameEvent[]> {
    const ref = collection(this.firestore, 'events');
    return collectionData(ref, { idField: 'id' }) as Observable<GameEvent[]>;
  }
}
