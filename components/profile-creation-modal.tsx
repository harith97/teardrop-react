"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ORANGE = "#FF6B35"

const avatarColors = [
  "#FF6B35",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FF9800",
  "#F44336",
  "#795548",
  "#607D8B",
  "#E91E63",
  "#00BCD4",
  "#8BC34A",
  "#FFC107",
]

const avatarEmojis = [
  "😊",
  "😎",
  "🤗",
  "😇",
  "🥳",
  "😍",
  "🤔",
  "😴",
  "🤓",
  "😋",
  "🙃",
  "😌",
  "🥰",
  "😏",
  "🤨",
  "😐",
  "🙄",
  "😑",
  "🤐",
  "😶",
]

type ProfileCreationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUsername?: string
  onComplete: (profile: {
    username: string
    bio: string
    avatarColor: string
    avatarEmoji: string
  }) => void
}

export function ProfileCreationModal({
  open,
  onOpenChange,
  initialUsername = "",
  onComplete,
}: ProfileCreationModalProps) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState(initialUsername)
  const [bio, setBio] = useState("")
  const [selectedColor, setSelectedColor] = useState(avatarColors[0])
  const [selectedEmoji, setSelectedEmoji] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  async function checkUsernameAvailability(username: string) {
    if (!username.trim() || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)
    try {
      // Simulate API call - in real app, check Firestore
      await new Promise((resolve) => setTimeout(resolve, 500))
      const taken = ["admin", "test", "user", "scripter"].includes(username.toLowerCase())
      setUsernameAvailable(!taken)
    } catch (error) {
      setUsernameAvailable(null)
    } finally {
      setCheckingUsername(false)
    }
  }

  const canProceedStep1 = username.length >= 3 && usernameAvailable === true
  const canComplete = canProceedStep1 && (selectedEmoji || selectedColor)

  function handleComplete() {
    if (!canComplete) return

    onComplete({
      username,
      bio,
      avatarColor: selectedColor,
      avatarEmoji: selectedEmoji,
    })

    // Reset form
    setStep(1)
    setUsername("")
    setBio("")
    setSelectedColor(avatarColors[0])
    setSelectedEmoji("")
    setUsernameAvailable(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Choose Your Username" : "Create Your Avatar"}</DialogTitle>
          <DialogDescription className="sr-only">
            {step === 1 ? "Choose a unique username for your profile" : "Customize your avatar with colors and emojis"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <div className="text-lg font-semibold">Welcome to Teardrop!</div>
              <div className="text-sm text-zinc-400">Let's set up your profile</div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Username</div>
              <div className="relative">
                <Input
                  placeholder="Choose a unique username"
                  className="bg-zinc-800 border-zinc-700 text-white pr-10"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
                    setUsername(val)
                    if (val.length >= 3) {
                      checkUsernameAvailability(val)
                    } else {
                      setUsernameAvailable(null)
                    }
                  }}
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {!checkingUsername && usernameAvailable === true && <span className="text-green-500">✓</span>}
                  {!checkingUsername && usernameAvailable === false && <span className="text-red-500">✗</span>}
                </div>
              </div>
              {username.length > 0 && username.length < 3 && (
                <div className="text-xs text-zinc-400 mt-1">Username must be at least 3 characters</div>
              )}
              {usernameAvailable === false && (
                <div className="text-xs text-red-400 mt-1">Username is already taken</div>
              )}
              {usernameAvailable === true && (
                <div className="text-xs text-green-400 mt-1">Username is available! ✨</div>
              )}
            </div>

            <div className="text-xs text-zinc-500">
              Your username will be visible to other users as @{username || "username"}
            </div>

            <Button
              className="w-full font-bold"
              style={{ background: ORANGE }}
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-3 text-3xl font-bold flex items-center justify-center"
                style={{ background: selectedColor }}
              >
                {selectedEmoji || username.charAt(0).toUpperCase()}
              </div>
              <div className="text-lg font-semibold">@{username}</div>
              <button className="text-sm text-blue-400 hover:text-blue-300" onClick={() => setStep(1)}>
                Change username
              </button>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Choose Avatar Style</div>
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-zinc-600 text-white hover:bg-zinc-700",
                    !selectedEmoji && "bg-zinc-700 border-orange-500",
                  )}
                  onClick={() => setSelectedEmoji("")}
                >
                  Letter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-zinc-600 text-white hover:bg-zinc-700",
                    selectedEmoji && "bg-zinc-700 border-orange-500",
                  )}
                  onClick={() => setSelectedEmoji(avatarEmojis[0])}
                >
                  Emoji
                </Button>
              </div>

              {selectedEmoji && (
                <div>
                  <div className="text-xs text-zinc-400 mb-2">Choose an emoji</div>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {avatarEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        className={cn(
                          "w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition",
                          selectedEmoji === emoji
                            ? "bg-orange-500 border-orange-500"
                            : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
                        )}
                        onClick={() => setSelectedEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-zinc-400 mb-2">Choose a color</div>
              <div className="grid grid-cols-6 gap-2">
                {avatarColors.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition",
                      selectedColor === color ? "border-white scale-110" : "border-zinc-600 hover:border-zinc-400",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Bio (optional)</div>
              <Textarea
                rows={3}
                placeholder="Tell others about yourself..."
                className="bg-zinc-800 border-zinc-700 text-white"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
              />
              <div className="text-xs text-zinc-400 mt-1">{bio.length}/150 characters</div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-600 text-white hover:bg-zinc-800 bg-transparent"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button className="flex-1 font-bold" style={{ background: ORANGE }} onClick={handleComplete}>
                Complete Profile
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
