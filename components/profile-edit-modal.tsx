"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ORANGE = "#FF6B35"

type ProfileEditModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    username: string
    email: string
    bio?: string
    avatarColor?: string
    avatarEmoji?: string
  } | null
  onSave: (data: {
    username: string
    bio: string
    avatarColor: string
    avatarEmoji: string
  }) => Promise<void>
}

export function ProfileEditModal({ open, onOpenChange, user, onSave }: ProfileEditModalProps) {
  const [editUsername, setEditUsername] = useState(user?.username || "")
  const [editBio, setEditBio] = useState(user?.bio || "")
  const [selectedColor, setSelectedColor] = useState(user?.avatarColor || ORANGE)
  const [selectedEmoji, setSelectedEmoji] = useState(user?.avatarEmoji || "")
  const [saving, setSaving] = useState(false)

  const avatarColors = ["#FF6B35", "#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#F44336", "#795548", "#607D8B"]

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await onSave({
        username: editUsername,
        bio: editBio,
        avatarColor: selectedColor,
        avatarEmoji: selectedEmoji,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save profile:", error)
      alert("Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-zinc-800 text-white max-w-md p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="text-white hover:bg-zinc-800 p-0 h-auto font-normal"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
            <DialogTitle className="text-lg font-semibold">Edit profile</DialogTitle>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
          <DialogDescription className="sr-only">
            Edit your profile information including avatar, name, email, username, and bio
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-6">
          {/* Avatar Section */}
          <div className="text-center mb-8">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-3 text-4xl font-bold flex items-center justify-center"
              style={{ background: selectedColor }}
            >
              {selectedEmoji || editUsername.charAt(0).toUpperCase()}
            </div>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">Change photo</button>
          </div>

          {/* Form Fields */}
          <div className="space-y-0">
            {/* Name Field */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div className="text-zinc-400 text-sm">Name</div>
              <div className="flex items-center gap-2">
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="bg-transparent border-none text-white text-right p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Enter name"
                />
                <div className="text-zinc-500">›</div>
              </div>
            </div>

            {/* Email Field */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div className="text-zinc-400 text-sm">Email</div>
              <div className="flex items-center gap-2">
                <div className="text-white text-sm">{user.email}</div>
                <div className="text-zinc-500">›</div>
              </div>
            </div>

            {/* Username Field */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div className="text-zinc-400 text-sm">Username</div>
              <div className="flex items-center gap-2">
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="bg-transparent border-none text-white text-right p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Enter username"
                />
                <div className="text-zinc-500">›</div>
              </div>
            </div>

            {/* Bio Field */}
            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
              <div className="text-zinc-400 text-sm">Bio</div>
              <div className="flex items-center gap-2">
                <Input
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="bg-transparent border-none text-white text-right p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Add bio"
                />
                <div className="text-zinc-500">›</div>
              </div>
            </div>
          </div>

          {/* Avatar Color Selection */}
          <div className="mt-6">
            <div className="text-sm font-semibold mb-3 text-zinc-300">Avatar Color</div>
            <div className="grid grid-cols-4 gap-3">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 transition",
                    selectedColor === color ? "border-white scale-110" : "border-zinc-600 hover:border-zinc-400",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            className="w-full mt-6 font-bold"
            style={{ background: ORANGE }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
