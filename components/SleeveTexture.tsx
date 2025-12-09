import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { CardSleeve } from '@/lib/card-sleeves'

export function useSleeveTexture(sleeve: CardSleeve) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 716 // Card ratio
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return null

    // Helper to convert hex to rgb
    const hexToRgb = (hex: number) => {
      return {
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255,
      }
    }

    // Helper to create color string
    const colorToString = (hex: number) => {
      const rgb = hexToRgb(hex)
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    }

    // Clear canvas
    ctx.fillStyle = colorToString(sleeve.color)
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply pattern
    switch (sleeve.pattern) {
      case 'gradient':
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        sleeve.colors.forEach((color, i) => {
          gradient.addColorStop(i / (sleeve.colors.length - 1), colorToString(color))
        })
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        break

      case 'stripes':
        const stripeWidth = 40
        ctx.fillStyle = colorToString(sleeve.colors[0])
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = colorToString(sleeve.colors[1])
        for (let i = 0; i < canvas.width; i += stripeWidth * 2) {
          ctx.fillRect(i, 0, stripeWidth, canvas.height)
        }
        break

      case 'dots':
        ctx.fillStyle = colorToString(sleeve.colors[0])
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = colorToString(sleeve.colors[1])
        const dotSize = 20
        const spacing = 40
        for (let x = spacing / 2; x < canvas.width; x += spacing) {
          for (let y = spacing / 2; y < canvas.height; y += spacing) {
            ctx.beginPath()
            ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        break

      case 'waves':
        const waveGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        sleeve.colors.forEach((color, i) => {
          waveGradient.addColorStop(i / (sleeve.colors.length - 1), colorToString(color))
        })
        ctx.fillStyle = waveGradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Add wave pattern overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 3
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath()
          for (let x = 0; x < canvas.width; x += 10) {
            const wave = Math.sin((x + y) * 0.02) * 15
            if (x === 0) {
              ctx.moveTo(x, y + wave)
            } else {
              ctx.lineTo(x, y + wave)
            }
          }
          ctx.stroke()
        }
        break

      case 'stars':
        ctx.fillStyle = colorToString(sleeve.colors[0])
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = colorToString(sleeve.colors[1])
        
        // Draw random stars
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          const size = Math.random() * 4 + 2
          
          ctx.beginPath()
          for (let j = 0; j < 5; j++) {
            const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2
            const radius = j % 2 === 0 ? size : size / 2
            const px = x + Math.cos(angle) * radius
            const py = y + Math.sin(angle) * radius
            if (j === 0) {
              ctx.moveTo(px, py)
            } else {
              ctx.lineTo(px, py)
            }
          }
          ctx.closePath()
          ctx.fill()
        }
        break

      case 'solid':
      default:
        // Already filled with base color
        break
    }

    // Add subtle border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)

    // Create Three.js texture
    const threeTexture = new THREE.CanvasTexture(canvas)
    threeTexture.minFilter = THREE.LinearFilter
    threeTexture.magFilter = THREE.LinearFilter
    threeTexture.colorSpace = THREE.SRGBColorSpace
    
    return threeTexture
  }, [sleeve])

  return texture
}
