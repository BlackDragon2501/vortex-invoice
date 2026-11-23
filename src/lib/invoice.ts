// Vortex Invoice - Facturas para freelancers con PDF e historial local (IndexedDB).
// El PDF se genera con jsPDF dentro del navegador; nada sale de tu equipo.

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'Dólar (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'MXN', symbol: '$', label: 'Peso mexicano (MXN)' },
  { code: 'ARS', symbol: '$', label: 'Peso argentino (ARS)' },
  { code: 'COP', symbol: '$', label: 'Peso colombiano (COP)' },
  { code: 'CLP', symbol: '$', label: 'Peso chileno (CLP)' },
  { code: 'PEN', symbol: 'S/', label: 'Sol peruano (PEN)' },
  { code: 'CNY', symbol: '¥', label: 'Yuan (CNY)' },
  { code: 'GBP', symbol: '£', label: 'Libra (GBP)' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export function currencyOf(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

/** formato monetario localizado por zona del navegador */
export function fmtMoney(n: number, code: CurrencyCode): string {
  const symbol = currencyOf(code).symbol
  const fixed = Math.abs(n) >= 1000
    ? n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toFixed(2)
  return `${symbol}${fixed}`
}

export interface Party {
  name: string
  taxId: string
  address: string
  email: string
}

export interface Item {
  desc: string
  qty: number
  unitPrice: number
}

export interface Invoice {
  id: string
  number: string
  issueDate: string
  dueDate: string
  currency: CurrencyCode
  taxRate: number
  from: Party
  to: Party
  items: Item[]
  notes: string
  createdAt: number
}

export function emptyParty(): Party {
  return { name: '', taxId: '', address: '', email: '' }
}

export function newInvoice(nextNumber: string): Invoice {
  const today = new Date()
  const due = new Date(today.getTime() + 15 * 24 * 3600 * 1000)
  return {
    id: Math.random().toString(36).slice(2, 10),
    number: nextNumber,
    issueDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    currency: 'USD',
    taxRate: 0,
    from: emptyParty(),
    to: emptyParty(),
    items: [{ desc: '', qty: 1, unitPrice: 0 }],
    notes: '',
    createdAt: Date.now(),
  }
}

export function itemSubtotal(it: Item): number {
  return (Number(it.qty) || 0) * (Number(it.unitPrice) || 0)
}

export function totalsOf(inv: Invoice): { subtotal: number; tax: number; total: number } {
  const subtotal = inv.items.reduce((s, it) => s + itemSubtotal(it), 0)
  const tax = subtotal * ((Number(inv.taxRate) || 0) / 100)
  return { subtotal, tax, total: subtotal + tax }
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** sugiere el siguiente número a partir del mayor existente "2026-003" → "2026-004" */
export function suggestNextNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear()
  let maxSeq = 0
  for (const inv of existing) {
    const m = inv.number.match(/^(\d{4})-(\d+)$/)
    if (m && parseInt(m[1], 10) === year) maxSeq = Math.max(maxSeq, parseInt(m[2], 10))
  }
  return `${year}-${String(maxSeq + 1).padStart(3, '0')}`
}

// ---------- historial en IndexedDB ----------

const DB_NAME = 'vortex-invoice'
const STORE = 'invoices'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No pude abrir la base local'))
  })
}

export async function listInvoices(): Promise<Invoice[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const list = (req.result as Invoice[]).sort((a, b) => b.createdAt - a.createdAt)
      resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveInvoice(inv: Invoice): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(inv)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
