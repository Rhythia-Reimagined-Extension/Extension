// IndexedDB persistence for the user-approved File System Access root handle.
const BACKUP_HANDLE_DB_NAME = 'rhythiax-local-backup';
const BACKUP_HANDLE_DB_VERSION = 1;
const BACKUP_HANDLE_STORE = 'handles';
const BACKUP_HANDLE_KEY = 'root';

function backupHandleOpenDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_HANDLE_DB_NAME, BACKUP_HANDLE_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BACKUP_HANDLE_STORE)) request.result.createObjectStore(BACKUP_HANDLE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local backup handle storage.'));
  });
}

async function backupHandleStore(handle) {
  const db = await backupHandleOpenDb();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
      transaction.objectStore(BACKUP_HANDLE_STORE).put(handle, BACKUP_HANDLE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not save local backup folder access.'));
    });
  } finally { db.close(); }
}

async function backupHandleGet() {
  const db = await backupHandleOpenDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(BACKUP_HANDLE_STORE, 'readonly');
      const request = transaction.objectStore(BACKUP_HANDLE_STORE).get(BACKUP_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read local backup folder access.'));
    });
  } finally { db.close(); }
}

async function backupHandleClear() {
  const db = await backupHandleOpenDb();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(BACKUP_HANDLE_STORE, 'readwrite');
      transaction.objectStore(BACKUP_HANDLE_STORE).delete(BACKUP_HANDLE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not forget local backup folder access.'));
    });
  } finally { db.close(); }
}
