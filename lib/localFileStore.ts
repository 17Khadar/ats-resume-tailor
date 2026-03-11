// ============================================================
// localFileStore — IndexedDB-backed file storage for when
// no backend server is available (production on Vercel).
// Stores resume DOCX files in the browser persistently.
// ============================================================

const DB_NAME = "ats-resume-files";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface LocalFileMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  storedAt: string;
}

interface StoredFile extends LocalFileMeta {
  data: ArrayBuffer;
}

/** Save a file to IndexedDB. Returns metadata (without the blob). */
export async function saveFile(file: File): Promise<LocalFileMeta> {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const data = await file.arrayBuffer();
  const record: StoredFile = {
    id,
    name: file.name,
    type: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: file.size,
    storedAt: new Date().toISOString(),
    data,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve({ id, name: record.name, type: record.type, size: record.size, storedAt: record.storedAt });
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a file's ArrayBuffer from IndexedDB. */
export async function getFile(id: string): Promise<StoredFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a file from IndexedDB. */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
