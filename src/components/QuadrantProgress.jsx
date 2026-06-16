/**
 * Circular 4-quadrant progress indicator.
 * Click cycles through 0→1→2→3→4→0.
 */
import React from 'react'

const QUADRANTS = [
  // Each path is a quarter of the circle (clockwise from top-right)
  // We draw filled quadrants as arcs via polygon approximation in SVG
  { id: 0, label: 'Q1 (top-right)'    },
  { id: 1, label: 'Q2 (bottom-right)' },
  { id: 2, label: 'Q3 (bottom-left)'  },
  { id: 3, label: 'Q4 (top-left)'     },
]

// Pre-computed SVG path data for each quadrant (clockwise from top)
const PATHS = [
  // Q1: top-right (12 o'clock → 3 o'clock)
  'M 50 50 L 50 5 A 45 45 0 0 1 95 50 Z',
  // Q2: bottom-right (3 o'clock → 6 o'clock)
  'M 50 50 L 95 50 A 45 45 0 0 1 50 95 Z',
  // Q3: bottom-left (6 o'clock → 9 o'clock)
  'M 50 50 L 50 95 A 45 45 0 0 1 5 50 Z',
  // Q4: top-left (9 o'clock → 12 o'clock)
  'M 50 50 L 5 50 A 45 45 0 0 1 50 5 Z',
]

const PERCENT = ['0%', '25%', '50%', '75%', '100%']

export default function QuadrantProgress({ value = 0, onChange, size = 44, readonly = false }) {
  const handleClick = () => {
    if (readonly || !onChange) return
    onChange((value + 1) % 5)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        onClick={handleClick}
        className={`rounded-full ${!readonly ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        title={readonly ? PERCENT[value] : `Click to advance (${PERCENT[value]})`}
        aria-label={`Progress: ${PERCENT[value]}`}
        role={readonly ? 'img' : 'button'}
      >
        {/* Outer circle background */}
        <circle cx="50" cy="50" r="48" fill="white" stroke="#d1d5db" strokeWidth="2" className="dark:fill-steel-800 dark:stroke-steel-600" />

        {/* Filled quadrants */}
        {PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={i < value ? '#111827' : 'transparent'}
            className={i < value ? 'dark:fill-steel-100' : ''}
          />
        ))}

        {/* Grid lines (dividers) */}
        <line x1="50" y1="5"  x2="50" y2="95" stroke="#d1d5db" strokeWidth="1.5" className="dark:stroke-steel-600" />
        <line x1="5"  y1="50" x2="95" y2="50" stroke="#d1d5db" strokeWidth="1.5" className="dark:stroke-steel-600" />

        {/* Outer ring */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#9ca3af" strokeWidth="2" className="dark:stroke-steel-500" />
      </svg>
      <span className="text-[10px] font-mono text-steel-500 dark:text-steel-400 leading-none">
        {PERCENT[value]}
      </span>
    </div>
  )
}
