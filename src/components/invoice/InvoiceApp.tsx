'use client'

// Vortex Invoice - Facturas con PDF (jsPDF) e historial local en IndexedDB.
// 100% en tu navegador: los datos y el PDF no salen de tu equipo.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FilePlus2,
  Download,
  Save,
  Trash2,
  Copy,
  History,
  ReceiptText,
  Plus,
  FileWarning,
} from 'lucide-react'
import {
  CURRENCIES,
  deleteInvoice,
  emptyParty,
  fmtDate,
  fmtMoney,
  itemSubtotal,
  listInvoices,
  newInvoice,
  saveInvoice,
  suggestNextNumber,
  totalsOf,
  type CurrencyCode,
  type Invoice,
  type Item,
  type Party,
} from '@/lib/invoice'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#facc15'
const ACCENT2 = '#fde047'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18 13h12v22l-3-2-3 2-3-2-3 2z" fill="none" stroke={ACCENT2} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Invoice · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fde047] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#facc15] hover:bg-[#fde047]'

const field =
  'w-full rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2 text-sm text-[#ececf1] outline-none focus:border-[#facc15]'

function PartyForm({ title, party, onChange }: { title: string; party: Party; onChange: (p: Party) => void }) {
  return (
    <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">{title}</p>
      <div className="space-y-2">
        <input className={field} placeholder="Nombre / razón social" value={party.name} onChange={(e) => onChange({ ...party, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={field} placeholder="NIF / RFC / RUT" value={party.taxId} onChange={(e) => onChange({ ...party, taxId: e.target.value })} />
          <input className={field} placeholder="Correo" value={party.email} onChange={(e) => onChange({ ...party, email: e.target.value })} />
        </div>
        <input className={field} placeholder="Dirección" value={party.address} onChange={(e) => onChange({ ...party, address: e.target.value })} />
      </div>
    </div>
  )
}

function downloadPdf(inv: Invoice) {
  void (async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const M = 48
    const cur = inv.currency
    const { subtotal, tax, total } = totalsOf(inv)

    // cabecera
    doc.setFillColor(15, 15, 16)
    doc.rect(0, 0, W, 92, 'F')
    doc.setTextColor(250, 204, 21)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(`FACTURA ${inv.number}`, M, 40)
    doc.setTextColor(236, 236, 241)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha de emisión: ${fmtDate(inv.issueDate)}`, M, 58)
    doc.text(`Vence: ${fmtDate(inv.dueDate)}`, M, 72)
    doc.setTextColor(155, 155, 164)
    doc.setFontSize(9)
    doc.text('Hecho con Vórtex Invoice · Vortex Company', W - M, 40, { align: 'right' })

    // partes
    let y = 120
    doc.setTextColor(236, 236, 241)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('EMISOR', M, y)
    doc.text('CLIENTE', W / 2 + 10, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const drawParty = (p: Party, x: number) => {
      let yy = y + 16
      const lines = [p.name, p.taxId, p.address, p.email].filter((s) => s.trim())
      for (const line of lines) {
        doc.setTextColor(200, 200, 208)
        doc.text(doc.splitTextToSize(line, W / 2 - M - 16), x, yy)
        yy += 14
      }
    }
    drawParty(inv.from, M)
    drawParty(inv.to, W / 2 + 10)
    y = Math.max(y + 16 + 4 * 14 + 8, 210)

    // tabla de ítems
    doc.setDrawColor(60, 60, 70)
    doc.setFillColor(30, 30, 34)
    doc.rect(M, y, W - 2 * M, 22, 'F')
    doc.setTextColor(155, 155, 164)
    doc.setFontSize(9)
    doc.text('DESCRIPCIÓN', M + 8, y + 15)
    doc.text('CANT.', W - M - 210, y + 15, { align: 'right' })
    doc.text('PRECIO', W - M - 110, y + 15, { align: 'right' })
    doc.text('IMPORTE', W - M - 8, y + 15, { align: 'right' })
    y += 22

    doc.setTextColor(236, 236, 241)
    doc.setFontSize(10)
    for (const it of inv.items) {
      const descLines = doc.splitTextToSize(it.desc.trim() || 'Concepto', W - 2 * M - 230)
      const rowH = Math.max(20, descLines.length * 13 + 8)
      if (y + rowH > doc.internal.pageSize.getHeight() - 150) {
        doc.addPage()
        y = 60
      }
      const fill = inv.items.indexOf(it) % 2 === 1
      if (fill) {
        doc.setFillColor(22, 22, 26)
        doc.rect(M, y, W - 2 * M, rowH, 'F')
      }
      doc.setTextColor(236, 236, 241)
      doc.text(descLines, M + 8, y + 14)
      doc.text(String(it.qty), W - M - 210, y + 14, { align: 'right' })
      doc.text(fmtMoney(it.unitPrice, cur), W - M - 110, y + 14, { align: 'right' })
      doc.text(fmtMoney(itemSubtotal(it), cur), W - M - 8, y + 14, { align: 'right' })
      y += rowH
    }

    // totales
    y += 16
    const tx = W - M - 200
    doc.setFontSize(10)
    doc.setTextColor(236, 236, 241)
    doc.text('Subtotal', tx, y)
    doc.text(fmtMoney(subtotal, cur), W - M - 8, y, { align: 'right' })
    if (inv.taxRate > 0) {
      y += 16
      doc.text(`Impuestos (${inv.taxRate}%)`, tx, y)
      doc.text(fmtMoney(tax, cur), W - M - 8, y, { align: 'right' })
    }
    y += 20
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(250, 204, 21)
    doc.text('TOTAL', tx, y)
    doc.text(fmtMoney(total, cur), W - M - 8, y, { align: 'right' })

    // notas
    if (inv.notes.trim()) {
      y += 36
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(155, 155, 164)
      doc.text(doc.splitTextToSize(`Notas: ${inv.notes}`, W - 2 * M), M, y)
    }

    // pie
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 130)
    doc.text(
      'Documento generado localmente con Vórtex Invoice (Vortex Company). Sin anuncios, sin servidores.',
      M,
      doc.internal.pageSize.getHeight() - 28
    )

    doc.save(`factura-${inv.number || 'borrador'}.pdf`)
  })()
}

export default function InvoiceApp() {
  const [inv, setInv] = useState<Invoice | null>(null)
  const [history, setHistory] = useState<Invoice[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const refresh = useCallback(async () => {
    try {
      const list = await listInvoices()
      setHistory(list)
      return list
    } catch {
      setErr('No pude leer el historial local (IndexedDB bloqueada).')
      return []
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const list = await refresh()
      setInv(newInvoice(suggestNextNumber(list)))
    })()
  }, [refresh])

  const totals = useMemo(() => (inv ? totalsOf(inv) : { subtotal: 0, tax: 0, total: 0 }), [inv])

  const update = (patch: Partial<Invoice>) => setInv((i) => (i ? { ...i, ...patch } : i))
  const updateItem = (idx: number, patch: Partial<Item>) =>
    setInv((i) => (i ? { ...i, items: i.items.map((it, k) => (k === idx ? { ...it, ...patch } : it)) } : i))
  const addItem = () => setInv((i) => (i ? { ...i, items: [...i.items, { desc: '', qty: 1, unitPrice: 0 }] } : i))
  const removeItem = (idx: number) =>
    setInv((i) => (i ? { ...i, items: i.items.filter((_, k) => k !== idx) } : i))

  const doSave = async () => {
    if (!inv) return
    if (!inv.number.trim()) {
      setErr('Ponle un número de factura (ej. 2026-001).')
      return
    }
    setErr('')
    try {
      await saveInvoice(inv)
      await refresh()
      setMsg(`Factura ${inv.number} guardada en tu equipo.`)
      setTimeout(() => setMsg(''), 2500)
    } catch {
      setErr('No pude guardar en el historial local.')
    }
  }

  const loadOne = (h: Invoice) => {
    setInv(JSON.parse(JSON.stringify(h)) as Invoice)
    setMsg(`Editando ${h.number} (copia de trabajo). Guarda para actualizar.`)
    setTimeout(() => setMsg(''), 2500)
  }

  const duplicate = (h: Invoice) => {
    const copy: Invoice = {
      ...JSON.parse(JSON.stringify(h)),
      id: Math.random().toString(36).slice(2, 10),
      number: suggestNextNumber(history),
      issueDate: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    }
    setInv(copy)
  }

  const remove = async (id: string) => {
    await deleteInvoice(id)
    await refresh()
  }

  if (!inv) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <VortexLogo className="w-9 h-9" />
            <h1 className="text-lg font-bold tracking-tight">Vórtex Invoice</h1>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-[#9b9ba4]">Preparando tu factura…</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex Invoice <span className="font-normal text-[#9b9ba4]">· Factura sin vueltas, sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">Facturas con PDF e historial en tu equipo · nada se sube a internet</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
        {/* barra de acciones */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4">
          <button className={btnAccent} onClick={() => setInv(newInvoice(suggestNextNumber(history)))}>
            <FilePlus2 className="h-3.5 w-3.5" /> Nueva
          </button>
          <button className={btn} onClick={doSave}>
            <Save className="h-3.5 w-3.5" /> Guardar
          </button>
          <button className={btn} onClick={() => downloadPdf(inv)}>
            <Download className="h-3.5 w-3.5" /> Descargar PDF
          </button>
          <span className="ml-auto text-xs text-[#9b9ba4]">Nº</span>
          <input
            value={inv.number}
            onChange={(e) => update({ number: e.target.value })}
            className="w-28 rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-2.5 py-1.5 font-mono text-sm outline-none focus:border-[#facc15]"
            placeholder="2026-001"
          />
        </div>

        {msg && <p className="text-xs text-[#4ade80]">{msg}</p>}
        {err && (
          <div className="flex items-center gap-2 rounded-xl border border-[#7f1d1d] bg-[#1a1214] px-3 py-2.5 text-xs text-[#f87171]">
            <FileWarning className="h-4 w-4" /> {err}
          </div>
        )}

        {/* datos generales */}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4 text-xs text-[#9b9ba4]">
            Emisión
            <input type="date" value={inv.issueDate} onChange={(e) => update({ issueDate: e.target.value })} className={`${field} mt-1.5`} />
          </label>
          <label className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4 text-xs text-[#9b9ba4]">
            Vencimiento
            <input type="date" value={inv.dueDate} onChange={(e) => update({ dueDate: e.target.value })} className={`${field} mt-1.5`} />
          </label>
          <label className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4 text-xs text-[#9b9ba4]">
            Moneda · impuestos
            <div className="mt-1.5 flex gap-2">
              <select
                value={inv.currency}
                onChange={(e) => update({ currency: e.target.value as CurrencyCode })}
                className={field}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={inv.taxRate}
                onChange={(e) => update({ taxRate: parseFloat(e.target.value) || 0 })}
                className={`${field} w-20`}
                title="% de impuestos"
              />
            </div>
          </label>
        </div>

        {/* partes */}
        <div className="grid gap-3 sm:grid-cols-2">
          <PartyForm title="Emisor (tú)" party={inv.from} onChange={(p) => update({ from: p })} />
          <PartyForm title="Cliente" party={inv.to} onChange={(p) => update({ to: p })} />
        </div>

        {/* ítems */}
        <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
              <ReceiptText className="h-3.5 w-3.5" /> Conceptos
            </p>
            <button className={btn} onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Añadir concepto
            </button>
          </div>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_72px_110px_110px_36px] gap-2 px-1 text-[10px] uppercase tracking-wide text-[#9b9ba4] sm:grid">
              <span>Descripción</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Importe</span>
              <span />
            </div>
            {inv.items.map((it, k) => (
              <div key={k} className="grid grid-cols-[1fr_64px_100px] items-center gap-2 sm:grid-cols-[1fr_72px_110px_110px_36px]">
                <input className={field} placeholder="¿Qué cobras?" value={it.desc} onChange={(e) => updateItem(k, { desc: e.target.value })} />
                <input type="number" min={0} step="any" className={field} value={it.qty} onChange={(e) => updateItem(k, { qty: parseFloat(e.target.value) || 0 })} title="Cantidad" />
                <input type="number" min={0} step="any" className={field} value={it.unitPrice} onChange={(e) => updateItem(k, { unitPrice: parseFloat(e.target.value) || 0 })} title="Precio unitario" />
                <span className="hidden text-right font-mono text-xs text-[#fde047] sm:block">{fmtMoney(itemSubtotal(it), inv.currency)}</span>
                <button className="justify-self-end text-[#9b9ba4] hover:text-[#f87171]" title="Quitar concepto" onClick={() => removeItem(k)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* totales */}
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-[#9b9ba4]">
              <span>Subtotal</span>
              <span className="font-mono">{fmtMoney(totals.subtotal, inv.currency)}</span>
            </div>
            {inv.taxRate > 0 && (
              <div className="flex justify-between text-[#9b9ba4]">
                <span>Impuestos ({inv.taxRate}%)</span>
                <span className="font-mono">{fmtMoney(totals.tax, inv.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#2b2b31] pt-2 text-base font-bold text-[#fde047]">
              <span>TOTAL</span>
              <span className="font-mono">{fmtMoney(totals.total, inv.currency)}</span>
            </div>
          </div>
        </div>

        {/* notas */}
        <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">Notas para el cliente (opcional)</p>
          <textarea
            value={inv.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={3}
            placeholder="Método de pago, plazos, gracias…"
            className="w-full resize-y rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2.5 text-sm outline-none focus:border-[#facc15]"
          />
        </div>

        {/* historial */}
        <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
            <History className="h-3.5 w-3.5" /> Historial en tu equipo ({history.length})
          </p>
          {history.length === 0 ? (
            <p className="text-xs text-[#9b9ba4]">Guarda tu primera factura y aparecerá aquí, viva en tu navegador.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h) => {
                const t = totalsOf(h)
                return (
                  <div key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2">
                    <span className="font-mono text-xs text-[#fde047]">{h.number}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-[#9b9ba4]">
                      {h.to.name || 'cliente sin nombre'} · {fmtDate(h.issueDate)}
                    </span>
                    <span className="font-mono text-xs text-[#ececf1]">{fmtMoney(t.total, h.currency)}</span>
                    <button className={`${btn} px-2 py-1`} title="Abrir en el editor" onClick={() => loadOne(h)}>
                      Editar
                    </button>
                    <button className={`${btn} px-2 py-1`} title="Duplicar con número nuevo" onClick={() => duplicate(h)}>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button className="text-[#9b9ba4] hover:text-[#f87171]" title="Eliminar del historial" onClick={() => void remove(h.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-[#9b9ba4]">
            El historial vive en IndexedDB de este navegador. Haz copias de seguridad exportando el PDF de cada factura.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
