/**
 * Utilitário IndexedDB para persistência de dados fiscais no navegador (Zero-Cloud).
 * Suporta centenas de megabytes sem esbarrar no limite de 5MB do localStorage.
 */

import { DetailedSaleRow, VinculoTroca, UploadHistoryItem } from "./types";

const DB_NAME = "VarejoInteligenteDB";
const DB_VERSION = 1;
const STORE_SESSION = "current_session";
const STORE_HISTORY = "upload_history";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB não suportado neste ambiente"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface SessionData {
  id: string;
  rows: DetailedSaleRow[];
  links: VinculoTroca[];
  currentStatus: string;
  updatedAt: string;
}

/**
 * Salva a sessão atual no IndexedDB
 */
export async function saveCurrentSession(
  rows: DetailedSaleRow[],
  links: VinculoTroca[],
  currentStatus: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSION, "readwrite");
      const store = transaction.objectStore(STORE_SESSION);
      const data: SessionData = {
        id: "active_session",
        rows,
        links,
        currentStatus,
        updatedAt: new Date().toISOString()
      };
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Falha ao salvar sessão no IndexedDB:", error);
  }
}

/**
 * Recupera a sessão atual do IndexedDB
 */
export async function loadCurrentSession(): Promise<SessionData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSION, "readonly");
      const store = transaction.objectStore(STORE_SESSION);
      const req = store.get("active_session");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Falha ao carregar sessão do IndexedDB:", error);
    return null;
  }
}

/**
 * Limpa a sessão atual do IndexedDB
 */
export async function clearCurrentSession(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SESSION, "readwrite");
      const store = transaction.objectStore(STORE_SESSION);
      const req = store.delete("active_session");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Falha ao limpar sessão do IndexedDB:", error);
  }
}

/**
 * Salva o histórico de uploads no IndexedDB
 */
export async function saveUploadHistory(history: UploadHistoryItem[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_HISTORY, "readwrite");
      const store = transaction.objectStore(STORE_HISTORY);
      store.clear();
      history.forEach((item) => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("Falha ao salvar histórico no IndexedDB:", error);
  }
}

/**
 * Carrega o histórico de uploads do IndexedDB
 */
export async function loadUploadHistory(): Promise<UploadHistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_HISTORY, "readonly");
      const store = transaction.objectStore(STORE_HISTORY);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as UploadHistoryItem[]) || [];
        // Ordena por data decrescente
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Falha ao carregar histórico do IndexedDB:", error);
    return [];
  }
}
