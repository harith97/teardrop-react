"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "../../components/ui/button"
import Link from "next/link"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const [plan, setPlan] = useState<string>("")
  const [duration, setDuration] = useState<string>("")
  const [tier, setTier] = useState<string>("")

  useEffect(() => {
    const planParam = searchParams.get("plan")
    const durationParam = searchParams.get("duration")
    const tierParam = searchParams.get("tier")
    
    setPlan(planParam || "")
    setDuration(durationParam || "")
    setTier(tierParam || "")
  }, [searchParams])

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-4">Payment Successful!</h1>
        
        {plan === "ad-free" && (
          <div className="text-zinc-300 mb-6">
            <p>You now have <strong>Ad-Free Forever</strong> access!</p>
            <p className="text-sm mt-2">Enjoy your distraction-free experience.</p>
          </div>
        )}
        
        {plan === "premium" && (
          <div className="text-zinc-300 mb-6">
            <p>Welcome to <strong>Premium Membership</strong>!</p>
            <p className="text-sm mt-2">
              {duration && `Duration: ${duration}`}
              {tier && ` • Tier: ${tier}`}
            </p>
            <p className="text-sm mt-2">All premium features are now unlocked.</p>
          </div>
        )}
        
        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              Return to App
            </Button>
          </Link>
          
          <div className="text-xs text-zinc-400">
            You will receive a confirmation email shortly.
          </div>
        </div>
      </div>
    </div>
  )
}
