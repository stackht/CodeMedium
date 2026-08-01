"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"

interface Option {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  required?: boolean
}

export function Select({ id, value, onChange, options, placeholder, className, required }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler, { passive: true })
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const selected = options.find((o) => o.value === value)
  const display = selected?.label || placeholder || "Select..."

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen(!open)}
        className={cn(
          "h-12 w-full flex items-center justify-between rounded-sm border px-4 text-sm outline-none transition",
          "border-neonGreen/20 bg-[#030a06] text-[#d8ffd2]",
          "focus:border-neonGreen/60 focus:ring-2 focus:ring-neonGreen/20",
          !selected && "text-[#d8ffd2]/50",
          className,
        )}
      >
        <span>{display}</span>
        <span className="text-neonGreen/60 text-xs ml-2" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="absolute z-[100] left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-sm border border-neonGreen/30 bg-[#020604] shadow-xl shadow-black/60">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                "w-full text-left px-4 py-3 text-sm transition",
                "text-[#d8ffd2]/70 hover:text-[#d8ffd2] hover:bg-neonGreen/10",
                opt.value === value && "text-neonGreen bg-neonGreen/8",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
