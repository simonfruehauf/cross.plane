import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { Cell } from './grid-store.service';

import { environment } from '../environments/environment';

// Firebase config from project setup
const firebaseConfig = environment.firebaseConfig;

@Injectable({ providedIn: 'root' })
export class FirebaseService {
    private app: FirebaseApp;
    private db: Firestore;
    private unsubscribe: Unsubscribe | null = null;

    // Simple session ID (replace with auth later)
    private sessionId = 'shared-grid';

    isSynced = signal(false);
    isLoading = signal(true);

    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
    }

    // Save all cells to Firestore
    async saveCells(cells: Map<string, Cell>): Promise<void> {
        const cellsArray = Array.from(cells.values()).filter(c => c.confirmed);
        const docRef = doc(this.db, 'grids', this.sessionId);

        await setDoc(docRef, {
            cells: cellsArray,
            updatedAt: new Date().toISOString()
        });

        this.isSynced.set(true);
    }

    // Load cells from Firestore
    async loadCells(): Promise<Cell[]> {
        const docRef = doc(this.db, 'grids', this.sessionId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            return data['cells'] || [];
        }

        return [];
    }

    // Subscribe to real-time updates (for multiplayer)
    subscribeToChanges(callback: (cells: Cell[]) => void): void {
        const docRef = doc(this.db, 'grids', this.sessionId);

        this.unsubscribe = onSnapshot(docRef, (snapshot: { exists: () => boolean; data: () => Record<string, unknown> | undefined }) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                callback((data?.['cells'] as Cell[]) || []);
            }
        });
    }

    // Cleanup subscription
    destroy(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
