"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder")

type PremiumModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Duration = "monthly" | "3months" | "6months" | "yearly"

export default function PremiumModal({ open, onOpenChange }: PremiumModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<Duration>("monthly")
  const [loading, setLoading] = useState(false)

  const durations = [
    { id: "monthly", label: "Monthly", discount: "" },
    { id: "3months", label: "3 Months", discount: "Save 10%" },
    { id: "6months", label: "6 Months", discount: "Save 15%" },
    { id: "yearly", label: "1 Year", discount: "Save 20%" },
  ] as const

  const handlePayment = async () => {
    setLoading(true)
    try {
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error("Stripe failed to load")
      }

      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "premium",
          duration: selectedDuration,
          tier: "default",
        }),
      })

      const session = await response.json()

      if (session.error) {
        throw new Error(session.error)
      }

      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Payment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getPrice = () => {
    const basePrice = 7.99 // Default tier price
    
    let multiplier = 1
    switch (selectedDuration) {
      case "3months":
        multiplier = 3 * 0.9 // 10% discount
        break
      case "6months":
        multiplier = 6 * 0.85 // 15% discount
        break
      case "yearly":
        multiplier = 12 * 0.8 // 20% discount
        break
      default:
        multiplier = 1
    }

    return `$${(basePrice * multiplier).toFixed(2)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            ✨ Premium Membership
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-1">
          {/* Premium Plan */}
          <div className="mb-6">
            <div className="rounded-xl p-6 bg-gradient-to-br from-orange-500 to-orange-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✨</span>
                <h3 className="text-xl font-bold">Premium Membership</h3>
              </div>
              <div className="text-3xl font-bold mb-1">{getPrice()}</div>
              <div className="text-zinc-300 mb-4">
                {selectedDuration === "monthly" ? "per month" : 
                 selectedDuration === "3months" ? "for 3 months" :
                 selectedDuration === "6months" ? "for 6 months" : "for 1 year"}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚫</span>
                  <span>Ad-Free Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  <span>Custom Themes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌈</span>
                  <span>Name Colors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📷</span>
                  <span>Multiple Photos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎤</span>
                  <span>Voice Notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <span>Pro Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <span>VIP Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <span>Early Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span>All Badges</span>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2">Select Duration:</div>
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((duration) => (
                    <button
                      key={duration.id}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        selectedDuration === duration.id
                          ? "bg-white text-black"
                          : "bg-zinc-700 hover:bg-zinc-600"
                      }`}
                      onClick={() => setSelectedDuration(duration.id)}
                    >
                      <div>{duration.label}</div>
                      {duration.discount && (
                        <div className="text-xs text-green-400">{duration.discount}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-white text-black hover:bg-gray-100 font-bold py-3 rounded-lg"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? "Processing..." : `Get Premium - ${getPrice()}`}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-zinc-400 mt-4">
            ✨ Keep ad-free forever even if you cancel!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
