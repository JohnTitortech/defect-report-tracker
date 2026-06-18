/**
 * ImageAnnotator — Canvas-based annotation tool.
 * Lets users draw circles, rectangles, and arrows on top of a cropped image
 * to mark defect locations. All shapes have red outline + transparent fill.
 * Returns a flat merged image (original + annotations) as a Blob via onDone.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Circle, Square, ArrowRight, Trash2, Undo2, Check, X, MousePointer } from 'lucide-react'

const STROKE_COLOR = '#ef4444'   // red-500
const STROKE_WIDTH = 3
const HIT_DIST    = 8            // px tolerance for hit-testing
const MIN_SIZE    = 20           // min shape size px

// ── Shape helpers ────────────────────────────────────────────────────────────

function getBounds(shape) {
  if (shape.type === 'arrow') {
    const x = Math.min(shape.x1, shape.x2)
    const y = Math.min(shape.y1, shape.y2)
    return { x, y, w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) }
  }
  return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
}

function ptInShape(shape, px, py) {
  if (shape.type === 'arrow') {
    // hit-test segment
    const { x1, y1, x2, y2 } = shape
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < 1) return false
    const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (len * len)
    const tc = Math.max(0, Math.min(1, t))
    const dx = px - (x1 + tc * (x2 - x1))
    const dy = py - (y1 + tc * (y2 - y1))
    return Math.hypot(dx, dy) < HIT_DIST + STROKE_WIDTH
  }
  if (shape.type === 'ellipse') {
    const cx = shape.x + shape.w / 2
    const cy = shape.y + shape.h / 2
    const rx = Math.abs(shape.w / 2)
    const ry = Math.abs(shape.h / 2)
    if (rx < 1 || ry < 1) return false
    // Distance from ellipse border
    const norm = Math.sqrt(((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2)
    return Math.abs(norm - 1) < HIT_DIST / Math.min(rx, ry)
  }
  if (shape.type === 'rect') {
    const x = Math.min(shape.x, shape.x + shape.w)
    const y = Math.min(shape.y, shape.y + shape.h)
    const w = Math.abs(shape.w)
    const h = Math.abs(shape.h)
    const onTop    = Math.abs(py - y) < HIT_DIST && px > x - HIT_DIST && px < x + w + HIT_DIST
    const onBottom = Math.abs(py - (y + h)) < HIT_DIST && px > x - HIT_DIST && px < x + w + HIT_DIST
    const onLeft   = Math.abs(px - x) < HIT_DIST && py > y - HIT_DIST && py < y + h + HIT_DIST
    const onRight  = Math.abs(px - (x + w)) < HIT_DIST && py > y - HIT_DIST && py < y + h + HIT_DIST
    return onTop || onBottom || onLeft || onRight
  }
  return false
}

function drawShape(ctx, shape, selected) {
  ctx.save()
  ctx.strokeStyle = selected ? '#fbbf24' : STROKE_COLOR // yellow if selected
  ctx.lineWidth   = selected ? STROKE_WIDTH + 1 : STROKE_WIDTH
  ctx.fillStyle   = 'rgba(0,0,0,0)'
  ctx.setLineDash([])

  if (shape.type === 'ellipse') {
    const cx = shape.x + shape.w / 2
    const cy = shape.y + shape.h / 2
    const rx = Math.abs(shape.w / 2)
    const ry = Math.abs(shape.h / 2)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  if (shape.type === 'rect') {
    const x = Math.min(shape.x, shape.x + shape.w)
    const y = Math.min(shape.y, shape.y + shape.h)
    ctx.beginPath()
    ctx.strokeRect(x, y, Math.abs(shape.w), Math.abs(shape.h))
  }

  if (shape.type === 'arrow') {
    const { x1, y1, x2, y2 } = shape
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const hs    = 14 // arrowhead size
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    // Arrowhead (filled)
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - hs * Math.cos(angle - Math.PI / 6), y2 - hs * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(x2 - hs * Math.cos(angle + Math.PI / 6), y2 - hs * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

// Handle dots for selected shape
function drawHandles(ctx, shape) {
  const handles = getHandles(shape)
  handles.forEach(h => {
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(h.x, h.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  })
}

function getHandles(shape) {
  if (shape.type === 'arrow') {
    return [
      { id: 'p1', x: shape.x1, y: shape.y1 },
      { id: 'p2', x: shape.x2, y: shape.y2 },
    ]
  }
  const x = Math.min(shape.x, shape.x + shape.w)
  const y = Math.min(shape.y, shape.y + shape.h)
  const w = Math.abs(shape.w)
  const h = Math.abs(shape.h)
  return [
    { id: 'tl', x, y },
    { id: 'tr', x: x + w, y },
    { id: 'br', x: x + w, y: y + h },
    { id: 'bl', x, y: y + h },
  ]
}

function hitHandle(shape, px, py) {
  return getHandles(shape).find(h => Math.hypot(h.x - px, h.y - py) < 8) || null
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ImageAnnotator({ imageDataUrl, onDone, onCancel }) {
  const canvasRef   = useRef(null)
  const imgRef      = useRef(null)
  const [tool,    setTool]    = useState('ellipse')   // ellipse | rect | arrow | select
  const [shapes,  setShapes]  = useState([])
  const [history, setHistory] = useState([])          // undo stack
  const [selIdx,  setSelIdx]  = useState(null)

  // Drag state (not in React state to avoid re-renders mid-drag)
  const drag = useRef(null)
  // { mode: 'draw'|'move'|'resize', shapeIdx, startX, startY, handle, origShape }

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = img; redraw([], null) }
    img.src = imageDataUrl
  }, [imageDataUrl])

  // ── Redraw ─────────────────────────────────────────────────────────────────
  const redraw = useCallback((sh = shapes, sel = selIdx) => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
    sh.forEach((s, i) => {
      drawShape(ctx, s, i === sel)
      if (i === sel) drawHandles(ctx, s)
    })
  }, [shapes, selIdx])

  useEffect(() => { redraw(shapes, selIdx) }, [shapes, selIdx])

  // ── Scale helpers (canvas coords ≠ CSS coords when canvas is scaled) ───────
  const toCanvas = useCallback((e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    }
  }, [])

  // ── Pointer down ───────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    const { x, y } = toCanvas(e)

    if (tool === 'select') {
      // 1. Try to grab a resize handle on selected shape first
      if (selIdx !== null) {
        const h = hitHandle(shapes[selIdx], x, y)
        if (h) {
          drag.current = {
            mode: 'resize', shapeIdx: selIdx, startX: x, startY: y,
            handle: h.id, origShape: { ...shapes[selIdx] }
          }
          return
        }
      }
      // 2. Try to hit a shape
      const hit = [...shapes].reverse().findIndex(s => ptInShape(s, x, y))
      const idx  = hit === -1 ? null : shapes.length - 1 - hit
      setSelIdx(idx)
      if (idx !== null) {
        drag.current = {
          mode: 'move', shapeIdx: idx, startX: x, startY: y,
          origShape: { ...shapes[idx] }
        }
      }
      return
    }

    // Drawing mode — push undo checkpoint
    setHistory(h => [...h, shapes.map(s => ({ ...s }))])
    setSelIdx(null)

    if (tool === 'ellipse' || tool === 'rect') {
      const newShape = { type: tool, x, y, w: 0, h: 0 }
      setShapes(prev => {
        const next = [...prev, newShape]
        drag.current = { mode: 'draw', shapeIdx: next.length - 1, startX: x, startY: y }
        return next
      })
    }

    if (tool === 'arrow') {
      const newShape = { type: 'arrow', x1: x, y1: y, x2: x, y2: y }
      setShapes(prev => {
        const next = [...prev, newShape]
        drag.current = { mode: 'draw', shapeIdx: next.length - 1, startX: x, startY: y }
        return next
      })
    }
  }, [tool, shapes, selIdx, toCanvas])

  // ── Pointer move ───────────────────────────────────────────────────────────
  const onPointerMove = useCallback((e) => {
    if (!drag.current) return
    e.preventDefault()
    const { x, y } = toCanvas(e)
    const d = drag.current

    setShapes(prev => {
      const next = prev.map((s, i) => {
        if (i !== d.shapeIdx) return s
        const o = d.origShape || s

        if (d.mode === 'draw') {
          if (s.type === 'arrow') return { ...s, x2: x, y2: y }
          return { ...s, w: x - d.startX, h: y - d.startY }
        }

        if (d.mode === 'move') {
          const dx = x - d.startX
          const dy = y - d.startY
          if (s.type === 'arrow')
            return { ...s, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy }
          return { ...s, x: o.x + dx, y: o.y + dy }
        }

        if (d.mode === 'resize') {
          const dx = x - d.startX
          const dy = y - d.startY
          if (s.type === 'arrow') {
            if (d.handle === 'p1') return { ...s, x1: o.x1 + dx, y1: o.y1 + dy }
            return { ...s, x2: o.x2 + dx, y2: o.y2 + dy }
          }
          // Normalise original shape
          const ox = Math.min(o.x, o.x + o.w)
          const oy = Math.min(o.y, o.y + o.h)
          const ow = Math.abs(o.w)
          const oh = Math.abs(o.h)
          switch (d.handle) {
            case 'tl': return { ...s, x: ox + dx, y: oy + dy, w: ow - dx, h: oh - dy }
            case 'tr': return { ...s, x: ox, y: oy + dy, w: ow + dx, h: oh - dy }
            case 'br': return { ...s, x: ox, y: oy, w: ow + dx, h: oh + dy }
            case 'bl': return { ...s, x: ox + dx, y: oy, w: ow - dx, h: oh + dy }
            default:   return s
          }
        }
        return s
      })
      return next
    })
  }, [toCanvas])

  // ── Pointer up ─────────────────────────────────────────────────────────────
  const onPointerUp = useCallback(() => {
    if (!drag.current) return
    const d = drag.current
    drag.current = null

    // Remove shapes that are too small
    if (d.mode === 'draw') {
      setShapes(prev => prev.filter((s, i) => {
        if (i !== d.shapeIdx) return true
        const b = getBounds(s)
        if (s.type === 'arrow') return Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > MIN_SIZE
        return b.w > MIN_SIZE || b.h > MIN_SIZE
      }))
    }
  }, [])

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = () => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setShapes(prev)
      setSelIdx(null)
      return h.slice(0, -1)
    })
  }

  const deleteSelected = () => {
    if (selIdx === null) return
    setHistory(h => [...h, shapes.map(s => ({ ...s }))])
    setShapes(prev => prev.filter((_, i) => i !== selIdx))
    setSelIdx(null)
  }

  const clearAll = () => {
    if (shapes.length === 0) return
    setHistory(h => [...h, shapes.map(s => ({ ...s }))])
    setShapes([])
    setSelIdx(null)
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleDone = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Draw without selection highlight for export
    const img = imgRef.current
    const offscreen = document.createElement('canvas')
    offscreen.width  = img.naturalWidth
    offscreen.height = img.naturalHeight
    const ctx = offscreen.getContext('2d')
    ctx.drawImage(img, 0, 0)
    shapes.forEach(s => drawShape(ctx, s, false))
    offscreen.toBlob(blob => {
      if (blob) onDone(blob, offscreen.toDataURL('image/jpeg', 0.92))
    }, 'image/jpeg', 0.92)
  }

  const TOOLS = [
    { id: 'select',  label: 'Select',   Icon: MousePointer },
    { id: 'ellipse', label: 'Lingkaran', Icon: Circle },
    { id: 'rect',    label: 'Kotak',     Icon: Square },
    { id: 'arrow',   label: 'Panah',     Icon: ArrowRight },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool buttons */}
        <div className="flex gap-1 bg-steel-100 dark:bg-steel-800 rounded-xl p-1">
          {TOOLS.map(({ id, label, Icon }) => (
            <button
              key={id}
              title={label}
              onClick={() => { setTool(id); setSelIdx(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${tool === id
                  ? 'bg-white dark:bg-steel-700 shadow text-accent'
                  : 'text-steel-500 hover:text-steel-800 dark:hover:text-steel-200'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={undo}
            disabled={history.length === 0}
            title="Undo"
            className="icon-btn disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          {selIdx !== null && (
            <button onClick={deleteSelected} title="Hapus shape" className="icon-btn text-red-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={clearAll}
            disabled={shapes.length === 0}
            title="Hapus semua"
            className="icon-btn text-red-400 hover:text-red-500 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-steel-400 -mt-2">
        {tool === 'select'
          ? 'Klik shape untuk memilih, drag untuk memindahkan, drag handle kuning untuk resize.'
          : `Drag di atas foto untuk menggambar ${
              tool === 'ellipse' ? 'lingkaran' : tool === 'rect' ? 'kotak' : 'panah'
            }.`}
      </p>

      {/* Canvas */}
      <div
        className="rounded-xl overflow-hidden border border-steel-200 dark:border-steel-700 bg-steel-900 relative"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-auto"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end gap-3 pt-1">
        <button onClick={onCancel} className="btn-ghost flex items-center gap-1">
          <X className="w-4 h-4" /> Batal
        </button>
        <button onClick={handleDone} className="btn-primary flex items-center gap-1">
          <Check className="w-4 h-4" /> Gunakan foto ini
        </button>
      </div>
    </div>
  )
}
