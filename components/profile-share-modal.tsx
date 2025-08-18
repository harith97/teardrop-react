"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"

const ORANGE = "#FF6B35"

type ProfileShareModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    username: string
    avatarColor?: string
    avatarEmoji?: string
  } | null
}

export function ProfileShareModal({ open, onOpenChange, user }: ProfileShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${user.username}`

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = profileUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function shareNative() {
    if (navigator.share && user) {
      navigator.share({
        title: `${user.username}'s Teardrop Profile`,
        text: `Check out my emotional journey on Teardrop!`,
        url: profileUrl,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Share Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Share your profile with others using QR code, link, or social media
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Preview */}
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-2 text-2xl font-bold flex items-center justify-center"
              style={{ background: user.avatarColor || ORANGE }}
            >
              {user.avatarEmoji || user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-lg font-semibold">@{user.username}</div>
            <div className="text-sm text-zinc-400">Teardrop Profile</div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg mx-auto w-fit">
            <QRCodeSVG value={profileUrl} size={120} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>

          {/* Profile Link */}
          <div>
            <div className="text-sm font-semibold mb-2">Profile Link</div>
            <div className="flex gap-2">
              <Input value={profileUrl} readOnly className="bg-zinc-800 border-zinc-700 text-white text-sm" />
              <Button
                variant="outline"
                className="border-zinc-600 text-white hover:bg-zinc-700 bg-transparent"
                onClick={copyToClipboard}
              >
                {copied ? "✓" : "📋"}
              </Button>
            </div>
            {copied && <div className="text-xs text-green-400 mt-1">Link copied to clipboard!</div>}
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-2">
            {'share' in navigator && (
              <Button
                variant="outline"
                className="border-zinc-600 text-white hover:bg-zinc-700 bg-transparent"
                onClick={shareNative}
              >
                📱 Share
              </Button>
            )}
            <Button
              variant="outline"
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-transparent"
              onClick={() => {
                const text = `Check out my emotional journey on Teardrop! ${profileUrl}`
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
                window.open(twitterUrl, "_blank")
              }}
            >
              🐦 Twitter
            </Button>
            <Button
              variant="outline"
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-transparent col-span-2"
              onClick={() => {
                const text = `Check out my emotional journey on Teardrop! ${profileUrl}`
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
                window.open(whatsappUrl, "_blank")
              }}
            >
              💬 WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
