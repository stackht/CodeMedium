"use client"

import { useEffect } from "react"

export default function CursorGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return

    const style = document.createElement("style")
    style.id = "cm-cursor-style"
    style.textContent = "* { cursor: none !important; }"
    document.head.appendChild(style)

    const observer = new MutationObserver(() => {
      if (!document.getElementById("cm-cursor-style")) {
        document.head.appendChild(style.cloneNode(true))
      }
    })
    observer.observe(document.head, { childList: true })

    const el = document.createElement("div")
    el.style.cssText = `
      position:fixed; z-index:99999; pointer-events:none;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:3px; width:10px; height:24px;
      top:0; left:0;
      will-change:transform;
      transition:width 0.15s,height 0.15s;
    `

    const topCap = document.createElement("div")
    const bar = document.createElement("div")
    const botCap = document.createElement("div")

    const setDefaultStyle = () => {
      const css = "border-radius:0; background:#39ff14; box-shadow:0 0 6px rgba(57,255,20,0.5); transition:background 0.12s,box-shadow 0.12s;"
      topCap.style.cssText = `width:100%; height:2px; ${css}`
      bar.style.cssText = `width:2px; height:14px; ${css}`
      botCap.style.cssText = `width:100%; height:2px; ${css}`
    }
    setDefaultStyle()

    el.appendChild(topCap)
    el.appendChild(bar)
    el.appendChild(botCap)
    document.body.appendChild(el)

    let hover = false
    let sx = window.innerWidth / 2
    let sy = window.innerHeight / 2

    const move = (e: MouseEvent) => {
      sx = e.clientX
      sy = e.clientY
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`
    }

    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const h = !!t.closest("a,button,input,select,textarea,[role=button],.cm-round-link,.terminal-tab,.cm-mark,label")
      if (h !== hover) {
        hover = h
        if (hover) {
          el.style.width = "14px"
          el.style.height = "28px"
          const c = "#00d9ff"
          const s = `0 0 10px rgba(0,217,255,0.6)`
          topCap.style.cssText = `width:100%; height:2px; background:${c}; box-shadow:${s};`
          bar.style.cssText = `width:2px; height:18px; background:${c}; box-shadow:${s};`
          botCap.style.cssText = `width:100%; height:2px; background:${c}; box-shadow:${s};`
        } else {
          setDefaultStyle()
          el.style.width = "10px"
          el.style.height = "24px"
        }
      }
    }

    window.addEventListener("mousemove", move, { passive: true })
    document.addEventListener("mouseover", over, { passive: true })

    return () => {
      observer.disconnect()
      style.remove()
      el.remove()
      window.removeEventListener("mousemove", move)
      document.removeEventListener("mouseover", over)
    }
  }, [])

  return null
}
