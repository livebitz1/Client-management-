import { useState, useEffect } from 'react'

export function useCountAnimation(finalValue: string | number, duration: number = 1000): string {
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    // Extract numeric value from string (handles currency formatted strings)
    let numericFinal = 0
    let isCurrency = false

    if (typeof finalValue === 'number') {
      numericFinal = finalValue
    } else {
      // Check if it's a currency value
      isCurrency = finalValue.includes('₹') || finalValue.includes('$')
      
      // Extract all digits from the string
      const digitsOnly = finalValue.replace(/\D/g, '')
      numericFinal = digitsOnly ? parseInt(digitsOnly, 10) : 0
    }

    if (numericFinal === 0) {
      setDisplayValue(finalValue as string)
      return
    }

    let startTime: number | null = null
    let animationFrameId: number

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Use cubic easing for smooth animation
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const currentValue = Math.floor(numericFinal * easeProgress)

      // Format the displayed value
      if (isCurrency) {
        // For currency values, format with Indian number system
        setDisplayValue(
          new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(currentValue)
        )
      } else {
        // For plain numbers, use Indian number format
        setDisplayValue(
          new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(currentValue)
        )
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        // Ensure final value is displayed exactly
        setDisplayValue(finalValue as string)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrameId)
  }, [finalValue, duration])

  return displayValue
}
