"use client"

import { Button } from "../../components/ui/button"
import Link from "next/link"

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-2xl font-bold text-white mb-4">Payment Cancelled</h1>
        
        <div className="text-zinc-300 mb-6">
          <p>Your payment was cancelled.</p>
          <p className="text-sm mt-2">No charges were made to your account.</p>
        </div>
        
        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              Return to App
            </Button>
          </Link>
          
          <div className="text-xs text-zinc-400">
            You can try again anytime from the settings menu.
          </div>
        </div>
      </div>
    </div>
  )
}
