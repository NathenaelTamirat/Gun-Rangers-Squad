export interface BattleRecord {
  id: number
  date: string
  gunA: string
  gunB: string
  arena: string
  winner: string
  shotsFired: number
  hitsLanded: number
  damageDealt: number
  criticals: number
  playerWon: boolean
}

const DB_NAME = 'RecoilDuelDB'
const DB_VERSION = 1
const STORE = 'battles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('playerWon', 'playerWon', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveBattle(record: Omit<BattleRecord, 'id'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add(record)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getBattleHistory(limit = 20): Promise<BattleRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const all: BattleRecord[] = []
    const req = store.index('date').openCursor(null, 'prev')
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor && all.length < limit) {
        all.push(cursor.value)
        cursor.continue()
      } else {
        resolve(all)
      }
    }
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function getTotalStats(): Promise<{
  totalBattles: number
  wins: number
  losses: number
  totalDamageDealt: number
  totalCriticals: number
}> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => {
      const records: BattleRecord[] = req.result
      db.close()
      resolve({
        totalBattles: records.length,
        wins: records.filter(r => r.playerWon).length,
        losses: records.filter(r => !r.playerWon).length,
        totalDamageDealt: records.reduce((s, r) => s + r.damageDealt, 0),
        totalCriticals: records.reduce((s, r) => s + r.criticals, 0),
      })
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}
