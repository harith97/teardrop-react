"use client"

import React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CalendarDays, MapIcon, Settings, User, Bell, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import GoogleMapView, { type GMapMarker } from "./google-map"
import { AdsenseLoader, AdSlot } from "./adsense"
import { ProfileCreationModal } from "./profile-creation-modal"
import { ProfileShareModal } from "./profile-share-modal"
import { ProfileEditModal } from "./profile-edit-modal"
import PremiumModal from "./premium-modal"

import {
  getFirebase,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  ensureUserDoc,
  setDoc,
  doc,
  updateDoc,
  getDoc,
} from "@/lib/firebase"

type Comment = {
  id: string
  userId: string
  username: string
  text: string
  timestamp: string
}

type Cry = {
  id: string
  emoji: string
  name: string
  rating: number
  locationTag?: string
  description?: string
  lat: number
  lng: number
  country?: string
  timestamp: string
  userId: string
  username: string
  likes: string[]
  comments: Comment[]
}

type UserProfile = {
  uid: string
  email: string
  username: string
  createdAt: string
  isPremium?: boolean
  isAdFree?: boolean
}

type Friend = {
  uid: string
  username: string
  displayName?: string
  avatarEmoji?: string
  avatarColor?: string
  isOnline?: boolean
  lastSeen?: string
}

type FriendRequest = {
  id: string
  fromUid: string
  fromUsername: string
  fromDisplayName?: string
  toUid: string
  status: "pending" | "accepted" | "rejected"
  timestamp: string
}

const ORANGE = "#FF6B35"
const GMAPS_KEY = "AIzaSyCvIhy5tUEeLjRKgZbJ5n5qDh5-nSFoaYA"

const stickers = [
  { emoji: "😢", name: "Crying", desc: "Regular tears from sadness, disappointment, or mild emotional pain" },
  { emoji: "😭", name: "Sobbing", desc: "Intense crying with loud sounds, overwhelming sadness or grief" },
  { emoji: "💔", name: "Heartbroken", desc: "Relationship pain, or deep emotional hurt" },
  { emoji: "😂", name: "Happy cry", desc: "Tears of joy or laughing so hard you cry" },
  { emoji: "😰", name: "Stressed", desc: "Anxious tears from pressure or worry" },
  { emoji: "🤧", name: "Sick crying", desc: "Ill and emotional, tissues needed" },
  { emoji: "🥲", name: "Bittersweet", desc: "Mixed emotions - sad but accepting" },
  { emoji: "😤", name: "Angry tears", desc: "Crying from frustration or rage" },
  { emoji: "😪", name: "Sleepy tears", desc: "Exhausted crying" },
  { emoji: "😩", name: "Exhausted", desc: "Completely drained emotionally" },
  { emoji: "🫠", name: "Melting", desc: "Overwhelming emotions" },
]

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

const defaultCenter = { lat: 55.6761, lng: 12.5683 }

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, val: T) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

function detectCountry(lat: number, lng: number) {
  const bounds: Record<string, { north: number; south: number; east: number; west: number }> = {
    Denmark: { north: 57.8, south: 54.5, east: 15.2, west: 8.0 },
    Germany: { north: 55.1, south: 47.3, east: 15.0, west: 5.9 },
    "United States": { north: 49.4, south: 24.5, east: -66.9, west: -125.0 },
    "United Kingdom": { north: 60.9, south: 49.9, east: 1.8, west: -8.6 },
    France: { north: 51.1, south: 41.3, east: 9.6, west: -5.1 },
    Spain: { north: 43.8, south: 36.0, east: 4.3, west: -9.3 },
    Italy: { north: 47.1, south: 36.6, east: 18.5, west: 6.6 },
    Canada: { north: 83.1, south: 41.7, east: -52.6, west: -141.0 },
  }
  for (const [country, b] of Object.entries(bounds)) {
    if (lat <= b.north && lat >= b.south && lng <= b.east && lng >= b.west) return country
  }
  return "Unknown"
}

const achDefs = {
  firstCry: { icon: "🎯", name: "First Cry", target: 1, desc: "Place your first cry on the map" },
  fiveCries: { icon: "🌟", name: "Emotional Explorer", target: 5, desc: "Place 5 cries" },
  tenCries: { icon: "💫", name: "Tear Tracker", target: 10, desc: "Place 10 cries" },
  twentyFiveCries: { icon: "🏆", name: "Cry Master", target: 25, desc: "Place 25 cries" },
  fiftyCries: { icon: "👑", name: "Emotional King", target: 50, desc: "Place 50 cries" },
  hundredCries: { icon: "💎", name: "Diamond Tears", target: 100, desc: "Place 100 cries" },
  weekStreak: { icon: "🔥", name: "Week Streak", target: 7, desc: "Cry every day for a week" },
  monthStreak: { icon: "🌙", name: "Month Streak", target: 30, desc: "Cry every day for a month" },
  worldTraveler: { icon: "🌍", name: "World Traveler", target: 5, desc: "Cry in 5 different countries" },
  globalExplorer: { icon: "🗺️", name: "Global Explorer", target: 10, desc: "Cry in 10 different countries" },
  popularCry: { icon: "❤️", name: "Popular Cry", target: 10, desc: "Get 10 likes on a single cry" },
  socialButterfly: { icon: "🦋", name: "Social Butterfly", target: 50, desc: "Get 50 total likes across all cries" },
}
type AchKey = keyof typeof achDefs

const timeAgo = (iso: string) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const intervals: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unit, size] of intervals) {
    const val = Math.floor(seconds / size)
    if (val >= 1) return `${val} ${unit}${val > 1 ? "s" : ""} ago`
  }
  return "just now"
}

export default function TeardropApp() {
  // Load AdSense once globally
  const adsenseLoader = <AdsenseLoader />

  // Firebase init
  const { auth, db, googleProvider } = getFirebase()

  // Auth
  const [user, setUser] = useState<UserProfile | null>(() => load<UserProfile | null>("td_user_v1", null))
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const isLoggedIn = !!user

  // Add after existing state declarations
  const [profileCreationOpen, setProfileCreationOpen] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string>("#FF6B35")
  const [avatarEmoji, setAvatarEmoji] = useState<string>("")
  const [profileShareOpen, setProfileShareOpen] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [criesModalOpen, setCriesModalOpen] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Nav
  const [page, setPage] = useState<"map" | "feed" | "profile" | "inbox" | "settings">("map")
  const headerTitle = useMemo(() => {
    switch (page) {
      case "map":
        return "Map"
      case "feed":
        return "Feed"
      case "profile":
        return "Profile"
      case "inbox":
        return "Inbox"
      case "settings":
        return "Settings"
    }
  }, [page])

  // Cries
  const [cries, setCries] = useState<Cry[]>(() => load<Cry[]>("td_cries_v1", [
    // Mock cries from friends for testing
    {
      id: "friend_cry_1",
      userId: "user2",
      username: "bob",
      name: "Bob",
      emoji: "😢",
      lat: 40.7128,
      lng: -74.0060,
      country: "United States",
      locationTag: "New York",
      description: "Had a rough day at work today",
      rating: 3,
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      likes: [],
      comments: [],
    },
    {
      id: "friend_cry_2",
      userId: "user3",
      username: "charlie",
      name: "Charlie",
      emoji: "😭",
      lat: 34.0522,
      lng: -118.2437,
      country: "United States",
      locationTag: "Los Angeles",
      description: "Missing my family back home",
      rating: 4,
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      likes: [],
      comments: [],
    }
  ]))
  useEffect(() => save("td_cries_v1", cries), [cries])

  // Likes
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>(() =>
    load<Record<string, boolean>>("td_likes_v1", {}),
  )
  useEffect(() => save("td_likes_v1", userLikes), [userLikes])

  // Filters
  const [filter, setFilter] = useState<"global" | "friends" | "mine">("global")

  // Map center
  const [center, setCenter] = useState(defaultCenter)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCenter(loc)
        setCurrentLocation(loc)
      },
      () => {},
    )
  }, [])

  // Cry modal state
  const [cryOpen, setCryOpen] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState(stickers[0])
  const [rating, setRating] = useState(0)
  const [locationTag, setLocationTag] = useState("")
  const [description, setDescription] = useState("")
  const [miniMarker, setMiniMarker] = useState<{ lat: number; lng: number } | null>(null)

  const [successOpen, setSuccessOpen] = useState(false)

  // Cry info bottom sheet
  const [infoOpen, setInfoOpen] = useState(false)
  const [viewCry, setViewCry] = useState<Cry | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")

  // Other modals
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [countriesOpen, setCountriesOpen] = useState(false)
  const [achOpen, setAchOpen] = useState<{ open: boolean; key: AchKey | null }>({ open: false, key: null })

  const [profileEditOpen, setProfileEditOpen] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")

  // Settings modals
  const [privacySettingsOpen, setPrivacySettingsOpen] = useState(false)
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false)
  const [feedSettingsOpen, setFeedSettingsOpen] = useState(false)
  const [statisticsOpen, setStatisticsOpen] = useState(false)

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends" | "private">("public")
  const [showLocation, setShowLocation] = useState(true)
  const [allowComments, setAllowComments] = useState(true)
  const [allowFriendRequests, setAllowFriendRequests] = useState(true)

  // Feed settings
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showEmotionalInsights, setShowEmotionalInsights] = useState(true)
  const [notifyNewCries, setNotifyNewCries] = useState(false)

  // Friends system
  const [friends, setFriends] = useState<Friend[]>(() => load<Friend[]>("td_friends_v1", [
    // Mock friends for testing
    {
      uid: "user2",
      username: "bob",
      displayName: "Bob",
      avatarEmoji: "👨",
      avatarColor: "#4CAF50",
    },
    {
      uid: "user3",
      username: "charlie",
      displayName: "Charlie",
      avatarEmoji: "😊",
      avatarColor: "#2196F3",
    }
  ]))
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => load<FriendRequest[]>("td_friend_requests_v1", [
    // Mock friend requests for testing
    {
      id: "mock_request_1",
      fromUid: "user1",
      fromUsername: "alice",
      fromDisplayName: "Alice",
      toUid: "current_user",
      status: "pending",
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    }
  ]))
  const [addFriendsOpen, setAddFriendsOpen] = useState(false)
  const [searchUsername, setSearchUsername] = useState("")
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => save("td_friends_v1", friends), [friends])
  useEffect(() => save("td_friend_requests_v1", friendRequests), [friendRequests])

  // Settings example
  const [notifyAchievements, setNotifyAchievements] = useState<boolean>(() => load("td_notify_achievements_v1", true))
  useEffect(() => save("td_notify_achievements_v1", notifyAchievements), [notifyAchievements])

  // Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebase().auth, async (u) => {
      if (u) {
        // Ensure Firestore profile
        await ensureUserDoc(u)
        // Read profile to get username
        const snap = await getDoc(doc(getFirebase().db, "users", u.uid))
        const profile = snap.exists() ? (snap.data() as any) : null
        const profileUser: UserProfile = {
          uid: u.uid,
          email: u.email || "",
          username: profile?.username || u.displayName || u.email?.split("@")[0] || "user",
          createdAt: profile?.createdAt || u.metadata?.creationTime || new Date().toISOString(),
          isPremium: !!profile?.isPremium,
          isAdFree: !!profile?.isAdFree,
        }
        setUser(profileUser)
        save("td_user_v1", profileUser)
      } else {
        setUser(null)
        save("td_user_v1", null)
      }
    })
    return () => unsub()
  }, [])

  // Friends functions
  async function searchUsers(username: string) {
    if (!username.trim() || !isLoggedIn || !db) return
    
    setSearching(true)
    try {
      // In a real app, you'd query Firestore
      // For now, we'll simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockUsers: Friend[] = [
        { uid: "user1", username: "alice", displayName: "Alice", avatarEmoji: "👩", avatarColor: "#FF6B35" },
        { uid: "user2", username: "bob", displayName: "Bob", avatarEmoji: "👨", avatarColor: "#4CAF50" },
        { uid: "user3", username: "charlie", displayName: "Charlie", avatarEmoji: "😊", avatarColor: "#2196F3" },
      ].filter(user => 
        user.username.toLowerCase().includes(username.toLowerCase()) &&
        user.uid !== user?.uid
      )
      
      setSearchResults(mockUsers)
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function sendFriendRequest(toUid: string, toUsername: string) {
    if (!isLoggedIn || !user) return
    
    const request: FriendRequest = {
      id: `${user.uid}_${toUid}_${Date.now()}`,
      fromUid: user.uid,
      fromUsername: user.username,
      toUid,
      status: "pending",
      timestamp: new Date().toISOString(),
    }
    
    setFriendRequests(prev => [...prev, request])
    
    // In a real app, you'd save to Firestore
    console.log("Friend request sent:", request)
  }

  async function acceptFriendRequest(requestId: string) {
    const request = friendRequests.find(r => r.id === requestId)
    if (!request || !isLoggedIn) return
    
    // Update request status
    setFriendRequests(prev => 
      prev.map(r => r.id === requestId ? { ...r, status: "accepted" } : r)
    )
    
    // Add to friends list
    const newFriend: Friend = {
      uid: request.fromUid,
      username: request.fromUsername,
      displayName: request.fromDisplayName,
    }
    
    setFriends(prev => [...prev, newFriend])
    
    // In a real app, you'd update Firestore
    console.log("Friend request accepted:", request)
  }

  async function rejectFriendRequest(requestId: string) {
    setFriendRequests(prev => 
      prev.map(r => r.id === requestId ? { ...r, status: "rejected" } : r)
    )
    
    // In a real app, you'd update Firestore
    console.log("Friend request rejected:", requestId)
  }

  function removeFriend(friendUid: string) {
    setFriends(prev => prev.filter(f => f.uid !== friendUid))
    
    // In a real app, you'd update Firestore
    console.log("Friend removed:", friendUid)
  }

  function signOut() {
    fbSignOut(auth)
  }

  function handleHeaderAction() {
    if (page === "settings" && isLoggedIn) {
      signOut()
    }
  }

  function startPlaceCry(at?: { lat: number; lng: number }) {
    if (!isLoggedIn) {
      setAuthMode("signin")
      setAuthOpen(true)
      return
    }
    setSelectedSticker(stickers[0])
    setRating(0)
    setLocationTag("")
    setDescription("")
    setMiniMarker(at ?? center)
    setCryOpen(true)
  }

  async function saveCry() {
    if (!isLoggedIn || !miniMarker || !user) return
    if (rating === 0) {
      alert("Please rate your cry")
      return
    }
    const now = new Date().toISOString()
    const country = detectCountry(miniMarker.lat, miniMarker.lng)
    const newCry: Cry = {
      id: `${Date.now()}`,
      emoji: selectedSticker.emoji,
      name: selectedSticker.name,
      rating,
      locationTag: locationTag.trim() || "",
      description: description.trim() || "",
      lat: miniMarker.lat,
      lng: miniMarker.lng,
      country,
      timestamp: now,
      userId: user.uid,
      username: user.username,
      likes: [],
      comments: [],
    }
    // Local first
    setCries((prev) => [newCry, ...prev])
    // Firestore
    try {
      await setDoc(doc(getFirebase().db, "cries", newCry.id), newCry)
      // Optionally increment stats
      const userRef = doc(getFirebase().db, "users", user.uid)
      const snap = await getDoc(userRef)
      const prevCount = (snap.exists() ? (snap.data() as any)?.stats?.cries : 0) || 0
      await updateDoc(userRef, { "stats.cries": prevCount + 1 })
    } catch (e) {
      console.error("Saving cry to Firestore failed", e)
    }
    setCryOpen(false)
    setSuccessOpen(true)
  }

  function openCryInfo(cry: Cry) {
    setViewCry(cry)
    setShowComments(false)
    setInfoOpen(true)
  }

  async function toggleLike(cry: Cry) {
    if (!isLoggedIn || !user) {
      setAuthMode("signin")
      setAuthOpen(true)
      return
    }
    const liked = userLikes[cry.id] === true
    setUserLikes((prev) => ({ ...prev, [cry.id]: !liked }))
    setCries((prev) =>
      prev.map((c) => {
        if (c.id !== cry.id) return c
        const set = new Set(c.likes)
        if (liked) set.delete(user.uid)
        else set.add(user.uid)
        const updated = { ...c, likes: Array.from(set) }
        if (viewCry?.id === cry.id) setViewCry(updated)
        // Firestore update (best-effort)
        updateDoc(doc(getFirebase().db, "cries", c.id), { likes: updated.likes }).catch(() => {})
        return updated
      }),
    )
  }

  async function addComment() {
    if (!isLoggedIn || !user || !viewCry) {
      setAuthMode("signin")
      setAuthOpen(true)
      return
    }
    const text = newComment.trim()
    if (!text) return
    const comment: Comment = {
      id: `${Date.now()}`,
      userId: user.uid,
      username: user.username,
      text,
      timestamp: new Date().toISOString(),
    }
    setCries((prev) =>
      prev.map((c) => {
        if (c.id !== viewCry.id) return c
        const updated = { ...c, comments: [...(c.comments || []), comment] }
        setViewCry(updated)
        // Firestore update (best-effort)
        updateDoc(doc(getFirebase().db, "cries", c.id), { comments: updated.comments }).catch(() => {})
        return updated
      }),
    )
    setNewComment("")
  }

  function deleteCry(cry: Cry) {
    if (!isLoggedIn || cry.userId !== user?.uid) return
    if (!confirm("Are you sure you want to delete this cry?")) return
    setCries((prev) => prev.filter((c) => c.id !== cry.id))
    // Firestore delete could be added; keeping simple: mark empty
    updateDoc(doc(getFirebase().db, "cries", cry.id), { deleted: true }).catch(() => {})
    setInfoOpen(false)
    setViewCry(null)
  }

  // Derived markers for Map
  const displayCries = useMemo(() => {
    if (filter === "mine" && isLoggedIn) {
      return cries.filter((c) => c.userId === user?.uid)
    }
    if (filter === "friends") {
      // friends feature not implemented yet
      return []
    }
    return cries
  }, [cries, filter, isLoggedIn, user?.uid])

  const markers: GMapMarker[] = useMemo(
    () => {
      const cryMarkers: GMapMarker[] = displayCries.map((c) => ({
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        emoji: c.emoji,
        title: `${c.name} - ${new Date(c.timestamp).toLocaleString()}`,
      }))
      
      // Add current location marker if available
      if (currentLocation) {
        cryMarkers.unshift({
          id: "current-location",
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          emoji: "", // No emoji needed for blue dot marker
          title: "Your current location",
          markerType: "current-location",
        })
      }
      
      return cryMarkers
    },
    [displayCries, currentLocation],
  )

  const avgRating = useMemo(() => {
    const me = cries.filter((c) => c.userId === (user?.uid || "anonymous"))
    if (!me.length) return "0.00"
    const sum = me.reduce((s, c) => s + (c.rating || 0), 0)
    return (sum / me.length).toFixed(2)
  }, [cries, user?.uid])

  const statsCountries = useMemo(() => {
    const me = cries.filter((c) => c.userId === (user?.uid || "anonymous"))
    const set = new Set(me.map((c) => c.country).filter(Boolean))
    return set.size
  }, [cries, user?.uid])

  const weekStreak = useMemo(() => {
    const me = cries.filter((c) => c.userId === (user?.uid || "anonymous")).map((c) => new Date(c.timestamp))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let streak = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const has = me.some((t) => {
        const td = new Date(t)
        td.setHours(0, 0, 0, 0)
        return td.getTime() === d.getTime()
      })
      if (has) streak++
      else break
    }
    return streak
  }, [cries, user?.uid])

  const achievements = useMemo(() => {
    const me = cries.filter((c) => c.userId === (user?.uid || "anonymous"))
    const countries = new Set(me.map((c) => c.country).filter((v) => v && v !== "Unknown"))
    const maxLikes = me.length ? Math.max(...me.map((c) => c.likes?.length ?? 0)) : 0
    const totalLikes = me.reduce((sum, c) => sum + (c.likes?.length ?? 0), 0)

    // Calculate streaks
    const sortedDates = me.map((c) => new Date(c.timestamp)).sort((a, b) => b.getTime() - a.getTime())
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0

    if (sortedDates.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < Math.min(365, sortedDates.length); i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)

        const hasActivity = sortedDates.some((date) => {
          const activityDate = new Date(date)
          activityDate.setHours(0, 0, 0, 0)
          return activityDate.getTime() === checkDate.getTime()
        })

        if (hasActivity) {
          tempStreak++
          if (i === 0) currentStreak = tempStreak
        } else {
          maxStreak = Math.max(maxStreak, tempStreak)
          tempStreak = 0
          if (i === 0) currentStreak = 0
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak)
    }

    const progress: Record<keyof typeof achDefs, { unlocked: boolean; value: number; target: number }> = {
      firstCry: { unlocked: me.length >= 1, value: me.length, target: 1 },
      fiveCries: { unlocked: me.length >= 5, value: me.length, target: 5 },
      tenCries: { unlocked: me.length >= 10, value: me.length, target: 10 },
      twentyFiveCries: { unlocked: me.length >= 25, value: me.length, target: 25 },
      fiftyCries: { unlocked: me.length >= 50, value: me.length, target: 50 },
      hundredCries: { unlocked: me.length >= 100, value: me.length, target: 100 },
      weekStreak: { unlocked: maxStreak >= 7, value: maxStreak, target: 7 },
      monthStreak: { unlocked: maxStreak >= 30, value: maxStreak, target: 30 },
      worldTraveler: { unlocked: countries.size >= 5, value: countries.size, target: 5 },
      globalExplorer: { unlocked: countries.size >= 10, value: countries.size, target: 10 },
      popularCry: { unlocked: maxLikes >= 10, value: maxLikes, target: 10 },
      socialButterfly: { unlocked: totalLikes >= 50, value: totalLikes, target: 50 },
    }
    return progress
  }, [cries, user?.uid])

  // Calendar helpers
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const monthCries = useMemo(() => {
    const y = calendarDate.getFullYear()
    const m = calendarDate.getMonth()
    return cries.filter((c) => {
      const d = new Date(c.timestamp)
      return d.getFullYear() === y && d.getMonth() === m && c.userId === (user?.uid || "anonymous")
    })
  }, [calendarDate, cries, user?.uid])

  const myCountryCounts = useMemo(() => {
    const me = cries.filter((c) => c.userId === (user?.uid || "anonymous"))
    const map = new Map<string, number>()
    me.forEach((c) => map.set(c.country || "Unknown", (map.get(c.country || "Unknown") || 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [cries, user?.uid])

  const isPremiumUser = (profileData: any) => !!profileData?.isPremium
  const isAdFreeUser = (profileData: any) => !!profileData?.isAdFree

  const shouldShowAds = () => {
    return !user?.isAdFree && !user?.isPremium
  }

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {adsenseLoader}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[rgba(26,26,26,0.95)] backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-sm sm:text-base">{headerTitle}</div>
        <div className="flex items-center gap-2">
          {page === "feed" && isLoggedIn && (
            <Button
              className="rounded-lg font-semibold px-4 py-2"
              style={{ background: ORANGE }}
              onClick={() => setAddFriendsOpen(true)}
            >
              Add Friends
            </Button>
          )}
          {page === "profile" && (
            <Button
              variant="outline"
              className="border-2 border-[var(--accent)] text-white hover:bg-[var(--accent)] bg-transparent"
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthMode("signin")
                  setAuthOpen(true)
                } else {
                  setCalendarOpen(true)
                }
              }}
              style={{ ["--accent" as any]: ORANGE }}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          )}
          {page === "settings" && isLoggedIn && (
            <Button className="rounded-full font-semibold" style={{ background: ORANGE }} onClick={handleHeaderAction}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("flex-1 mb-[80px] overflow-hidden", page === "map" ? "mt-0" : "mt-[60px]")}>
        {/* Map Page */}
        <section className={cn("h-full", page === "map" ? "block" : "hidden")}>
          <div className="h-full relative">
            <div className="absolute inset-0">
              <GoogleMapView
                apiKey={GMAPS_KEY}
                center={center}
                height={"100%"}
                markers={markers}
                onMarkerClick={(id) => {
                  if (id === "current-location") {
                    // Center map on current location when clicked
                    if (currentLocation) {
                      setCenter(currentLocation)
                    }
                  } else {
                    // Handle cry markers
                    const cry = cries.find((c) => c.id === id)
                    if (cry) openCryInfo(cry)
                  }
                }}
                onMapClick={(pos) => startPlaceCry(pos)}
              />
            </div>

            {/* Filter overlay */}
            <div className="absolute top-[70px] left-1/2 -translate-x-1/2 z-10">
              <div className="bg-[rgba(26,26,26,0.9)] backdrop-blur rounded-full p-2 flex gap-2">
                {(["global", "friends", "mine"] as const).map((f) => (
                  <Button
                    key={f}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      filter === f
                        ? "bg-[#FF6B35] text-white shadow-lg"
                        : "bg-transparent text-zinc-300 border border-zinc-600"
                    )}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

           

            {/* Place Cry button */}
            <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-10">
              <Button
                className="px-6 py-6 rounded-full font-bold shadow-lg"
                style={{ background: `linear-gradient(45deg, ${ORANGE}, #F7931E)` }}
                onClick={() => startPlaceCry()}
              >
                😭 Place your cry
              </Button>
            </div>
          </div>
        </section>

        {/* Feed Page */}
        <section className={cn("h-full overflow-y-auto px-4 py-4", page === "feed" ? "block" : "hidden")}>
          {!isLoggedIn ? (
            <div className="text-center text-zinc-300 py-10">
              <div className="text-4xl mb-2">🔐</div>
              <h3 className="text-xl font-semibold">Join the Community!</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Create an account to connect with friends and see their emotional journeys.
              </p>
              <Button
                className="mt-5 font-bold rounded-full"
                style={{ background: ORANGE }}
                onClick={() => {
                  setAuthMode("signup")
                  setAuthOpen(true)
                }}
              >
                Create Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center text-zinc-300 py-10">
                  <div className="text-6xl mb-4 text-blue-300">👥</div>
                  <h3 className="text-xl font-semibold text-white">No Friends Yet</h3>
                  <p className="text-sm text-zinc-400 mt-1">Add friends to see their emotional journeys here</p>
                  <Button
                    className="mt-6 font-bold rounded-lg px-6 py-3"
                    style={{ background: ORANGE }}
                    onClick={() => setAddFriendsOpen(true)}
                  >
                    Add Your First Friend
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-lg font-semibold text-white mb-4">Friends' Emotional Journeys</div>
                  
                  {/* Friend requests section */}
                  {friendRequests.filter(r => r.status === "pending").length > 0 && (
                    <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                      <h4 className="text-white font-semibold mb-3">Friend Requests</h4>
                      <div className="space-y-3">
                        {friendRequests
                          .filter(r => r.status === "pending")
                          .map(request => (
                            <div key={request.id} className="flex items-center justify-between bg-zinc-700 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                  {request.fromUsername.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-white font-medium">@{request.fromUsername}</div>
                                  <div className="text-xs text-zinc-400">Sent {timeAgo(request.timestamp)}</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => acceptFriendRequest(request.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-600 text-zinc-300"
                                  onClick={() => rejectFriendRequest(request.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Friends' cries */}
                  <div className="space-y-3">
                    {cries
                      .filter(cry => friends.some(friend => friend.uid === cry.userId))
                      .map(cry => (
                        <div key={cry.id} className="bg-zinc-800 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{cry.emoji}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white">{cry.name}</span>
                                <span className="text-xs text-zinc-400">•</span>
                                <span className="text-xs text-zinc-400">{timeAgo(cry.timestamp)}</span>
                              </div>
                              <div className="text-sm text-zinc-300 mb-2">
                                {cry.locationTag || cry.country} • ⭐ {cry.rating}/5
                              </div>
                              {cry.description && (
                                <div className="text-sm text-zinc-300 italic">"{cry.description}"</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {cries.filter(cry => friends.some(friend => friend.uid === cry.userId)).length === 0 && (
                    <div className="text-center text-zinc-400 py-8">
                      <div className="text-4xl mb-2">😴</div>
                      <p>Your friends haven't shared any emotional journeys yet</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Ad between content */}
              <AdSlot slot="5871608851" />
            </div>
          )}
        </section>

        {/* Profile Page */}
        <section className={cn("h-full overflow-y-auto px-4 py-4", page === "profile" ? "block" : "hidden")}>
          <div className="text-center">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-3 text-4xl font-bold flex items-center justify-center relative cursor-pointer"
              style={{ background: selectedAvatar }}
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthMode("signin")
                  setAuthOpen(true)
                } else {
                  setProfileEditOpen(true)
                }
              }}
            >
              {avatarEmoji || (user?.username || "G").charAt(0).toUpperCase()}
            </div>
            <div className="text-xl font-bold">{isLoggedIn ? `@${user!.username}` : "Guest User"}</div>
            <div className="text-sm text-zinc-400">
              {isLoggedIn ? `Member since ${new Date().toLocaleDateString()}` : "Not signed in"}
            </div>

            {/* Profile action buttons */}
            <div className="flex gap-3 justify-center mt-4">
              <Button
                variant="outline"
                className="border-2 rounded-full bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700"
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthMode("signin")
                    setAuthOpen(true)
                  } else {
                    setProfileEditOpen(true)
                  }
                }}
              >
                Edit profile
              </Button>
              <Button
                variant="outline"
                className="border-2 rounded-full bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700"
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthMode("signin")
                    setAuthOpen(true)
                  } else {
                    setProfileShareOpen(true)
                  }
                }}
              >
                Share profile
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-2 rounded-full bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700"
                onClick={() => {
                  if (!isLoggedIn) {
                    setAuthMode("signin")
                    setAuthOpen(true)
                  } else {
                    const url = `${window.location.origin}/profile/${user?.username}`
                    navigator.clipboard.writeText(url)
                    alert("Profile link copied to clipboard!")
                  }
                }}
              >
                🔗
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <Stat 
              card 
              title="Cries" 
              value={cries.filter((c) => c.userId === (user?.uid || "anonymous")).length} 
              highlight={true}
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthMode("signin")
                  setAuthOpen(true)
                } else {
                  setCriesModalOpen(true)
                }
              }}
            />
            <Stat card title="Following" value={friends.length} />
            <Stat card title="Followers" value={friendRequests.filter(r => r.status === "accepted").length} />
            <Stat card title="Countries" value={statsCountries} highlight onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                setCountriesOpen(true)
              }
            }} />
          </div>

          <div className="grid grid-cols-4 gap-3 mt-4">
            <Stat card title="Avg Rating" value={avgRating} />
            <Stat card title="Cries/Week" value={weeklyCount(cries, user?.uid || "anonymous", 7).toFixed(2)} />
            <Stat card title="Cries/Month" value={weeklyCount(cries, user?.uid || "anonymous", 30).toFixed(2)} />
            <Stat card title="Cries/Year" value={(weeklyCount(cries, user?.uid || "anonymous", 30) * 12).toFixed(2)} />
          </div>

          {/* Achievements */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-semibold">Achievements</div>
              <div className="text-sm text-zinc-400">
                {Object.values(achievements).filter((a) => a.unlocked).length}/{Object.keys(achDefs).length} unlocked
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(Object.keys(achDefs) as AchKey[]).map((k) => {
                const a = achievements[k]
                const def = achDefs[k]
                const pct = Math.min(100, Math.floor((a.value / def.target) * 100))
                const unlocked = a.unlocked
                return (
                  <button
                    key={k}
                    onClick={() => {
                      if (!isLoggedIn) {
                        setAuthMode("signin")
                        setAuthOpen(true)
                      } else {
                        setAchOpen({ open: true, key: k })
                      }
                    }}
                    className={cn(
                      "rounded-lg p-3 text-center border transition",
                      unlocked
                        ? "bg-[linear-gradient(45deg,#FF6B35,#F7931E)] text-black border-transparent"
                        : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
                    )}
                  >
                    <div className="text-2xl">{def.icon}</div>
                    <div className="text-xs font-bold mt-1">{def.name}</div>
                    <div className="h-1.5 bg-zinc-600 rounded mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${pct}%`, ["--accent" as any]: ORANGE }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>


        </section>

        {/* Inbox Page */}
        <section className={cn("h-full overflow-y-auto px-4 py-4", page === "inbox" ? "block" : "hidden")}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔔</div>
            <h3 className="text-xl font-semibold">Notifications</h3>
            <p className="text-sm text-zinc-400 mt-1">Your achievements and updates</p>
          </div>
          
          {/* Achievements as Notifications */}
          <div className="space-y-3">
            {(Object.keys(achDefs) as AchKey[]).map((k) => {
              const a = achievements[k]
              const def = achDefs[k]
              const unlocked = a.unlocked
              
              // Only show unlocked achievements
              if (!unlocked) return null
              
              return (
                <div
                  key={k}
                  className="rounded-lg p-4 border transition-all bg-zinc-800 border-yellow-400/50 border-l-4 border-l-yellow-400"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {def.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-white">
                          Achievement Unlocked!
                        </h4>
                        <span className="text-xs text-yellow-400 font-bold">✓</span>
                      </div>
                      <p className="text-sm text-zinc-300 mb-2">
                        {def.desc}
                      </p>
                      <div className="text-xs text-zinc-400 mt-2">just now</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          
        </section>

        {/* Settings Page */}
        <section className={cn("h-full overflow-y-auto", page === "settings" ? "block" : "hidden")}>
          {/* Privacy & Safety */}
          <div
            className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-[var(--accent)]"
            style={{ ["--accent" as any]: ORANGE }}
          >
            Privacy & Safety
          </div>
          <SettingRow title="🛡️ Privacy settings" onClick={() => {
            if (!isLoggedIn) {
              setAuthMode("signin")
              setAuthOpen(true)
            } else {
              setPrivacySettingsOpen(true)
            }
          }} />
          <SettingRow title="🚫 Blocked users" onClick={() => {
            if (!isLoggedIn) {
              setAuthMode("signin")
              setAuthOpen(true)
            } else {
              setBlockedUsersOpen(true)
            }
          }} />

          {/* General */}
          <div
            className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-[var(--accent)] mt-4"
            style={{ ["--accent" as any]: ORANGE }}
          >
            General
          </div>
          <ToggleRow title="🔔 Notifications" value={notifyAchievements} onChange={(value) => {
            if (!isLoggedIn) {
              setAuthMode("signin")
              setAuthOpen(true)
            } else {
              setNotifyAchievements(value)
            }
          }} />
          <SettingRow title="📱 Feed" onClick={() => {
            if (!isLoggedIn) {
              setAuthMode("signin")
              setAuthOpen(true)
            } else {
              setFeedSettingsOpen(true)
            }
          }} />
          <SettingRow title="📊 Statistics" onClick={() => {
            if (!isLoggedIn) {
              setAuthMode("signin")
              setAuthOpen(true)
            } else {
              setStatisticsOpen(true)
            }
          }} />
          <SettingRow
            title="📄 Export data (CSV)"
            onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                const csvData = cries
                  .filter((c) => c.userId === user?.uid)
                  .map((c) => ({
                    Date: new Date(c.timestamp).toLocaleDateString(),
                    Time: new Date(c.timestamp).toLocaleTimeString(),
                    Emotion: c.name,
                    Rating: c.rating,
                    Location: c.locationTag || c.country,
                    Description: c.description || "",
                    Likes: c.likes?.length || 0,
                    Comments: c.comments?.length || 0,
                  }))

                const csvContent = [
                  Object.keys(csvData[0] || {}).join(","),
                  ...csvData.map((row) =>
                    Object.values(row)
                      .map((val) => `"${val}"`)
                      .join(","),
                  ),
                ].join("\n")

                const blob = new Blob([csvContent], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `teardrop-data-${new Date().toISOString().split("T")[0]}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
          />
          <SettingRow
            title="📋 Export data (JSON)"
            onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                const jsonData = {
                  user: user,
                  cries: cries.filter((c) => c.userId === user?.uid),
                  exportDate: new Date().toISOString(),
                  totalCries: cries.filter((c) => c.userId === user?.uid).length,
                  achievements: achievements,
                }

                const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `teardrop-data-${new Date().toISOString().split("T")[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }
            }}
          />

          {/* Premium Section */}
          <div
            className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-[var(--accent)] mt-4"
            style={{ ["--accent" as any]: ORANGE }}
          >
            🌟 Premium
          </div>
          {!isPremiumUser(user) && !isAdFreeUser(user) && (
            <div 
              className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthMode("signin")
                  setAuthOpen(true)
                } else {
                  setPremiumModalOpen(true)
                }
              }}
            >
              <div>
                <div className="font-medium">🚫 Remove Ads</div>
                <div className="text-xs text-zinc-400">One-time $2.99 or Premium monthly</div>
              </div>
              <div className="text-zinc-400 text-sm">From $2.99</div>
            </div>
          )}
          {(isPremiumUser(user) || isAdFreeUser(user)) && (
            <div 
              className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
              onClick={() => {
                if (!isLoggedIn) {
                  setAuthMode("signin")
                  setAuthOpen(true)
                } else {
                  setPremiumModalOpen(true)
                }
              }}
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  ✨ Premium Member
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                </div>
                <div className="text-xs text-zinc-400">Manage your subscription</div>
              </div>
              <div className="text-zinc-400 text-xl">›</div>
            </div>
          )}

          {/* About */}
          <div
            className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-[var(--accent)] mt-4"
            style={{ ["--accent" as any]: ORANGE }}
          >
            About
          </div>
          <LinkRow title="📷 Instagram" href="https://instagram.com/teardrop" />
          <LinkRow title="🐦 X (Twitter)" href="https://x.com/teardrop" />
          <LinkRow title="🌐 Website" href="https://teardrop.app" />
          <LinkRow title="📧 Email" href="mailto:support@teardrop.app" />

          {/* Feedback */}
          <div
            className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-[var(--accent)] mt-4"
            style={{ ["--accent" as any]: ORANGE }}
          >
            Feedback
          </div>
          <SettingRow
            title="⚠️ Report a problem"
            onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                const email = "support@teardrop.app"
                const subject = "Problem Report"
                const body = "Describe the problem you encountered:\n\n"
                window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
              }
            }}
          />
          <SettingRow
            title="💡 Make a suggestion"
            onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                const email = "support@teardrop.app"
                const subject = "Feature Suggestion"
                const body = "I have a suggestion for Teardrop:\n\n"
                window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
              }
            }}
          />

          {/* Danger Zone */}
          <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 font-semibold text-red-500 mt-4">
            Danger Zone
          </div>
          <div
            className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
            onClick={() => {
              if (!isLoggedIn) {
                setAuthMode("signin")
                setAuthOpen(true)
              } else {
                if (confirm("Are you sure you want to request account deletion? This action cannot be undone.")) {
                  alert(
                    "Account deletion request submitted. You will receive an email with further instructions within 48 hours.",
                  )
                }
              }
            }}
          >
            <div className="font-medium text-red-500">🗑️ Request account deletion</div>
            <div className="text-zinc-400 text-xl">›</div>
          </div>

          {/* AdSense Ad for non-premium users */}
          {shouldShowAds() && (
            <div className="px-4 py-4">
              <AdSlot slot="1594464252" style={{ display: "inline-block", width: 160, height: 600 }} />
            </div>
          )}

          <div className="text-center text-xs text-zinc-500 py-6">App version: 5.2.0</div>
        </section>
      </div>

      

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-900/90 border-t border-zinc-800 z-50 grid grid-cols-5">
        <NavItem
          label="Map"
          active={page === "map"}
          onClick={() => setPage("map")}
          icon={<MapIcon className="w-5 h-5" />}
        />
        <NavItem
          label="Feed"
          active={page === "feed"}
          onClick={() => setPage("feed")}
          icon={<span className="text-xl">👥</span>}
        />
        <NavItem
          label="Profile"
          active={page === "profile"}
          onClick={() => setPage("profile")}
          icon={<User className="w-5 h-5" />}
        />
        <NavItem
          label="Inbox"
          active={page === "inbox"}
          onClick={() => setPage("inbox")}
          icon={<Bell className="w-5 h-5" />}
        />
        <NavItem
          label="Settings"
          active={page === "settings"}
          onClick={() => setPage("settings")}
          icon={<Settings className="w-5 h-5" />}
        />
      </nav>

      {/* Auth Modal (Firebase) */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{authMode === "signin" ? "Sign In" : "Create Account"}</DialogTitle>
            <DialogDescription className="sr-only">
              {authMode === "signin" ? "Sign in to your account" : "Create a new account to get started"}
            </DialogDescription>
          </DialogHeader>
          <AuthForm
            mode={authMode}
            onSwitchMode={() => setAuthMode((m) => (m === "signin" ? "signup" : "signin"))}
            onEmailSignin={async (email, password) => {
              await signInWithEmailAndPassword(getFirebase().auth, email, password)
              setAuthOpen(false)
            }}
            onEmailSignup={async (email, username, password) => {
              const cred = await createUserWithEmailAndPassword(getFirebase().auth, email, password)
              await updateProfile(cred.user, { displayName: username })
              await ensureUserDoc(cred.user, username)
              setAuthOpen(false)
              // Show profile creation modal for new users
              setEditUsername(username)
              setProfileCreationOpen(true)
            }}
            onGoogle={async () => {
              const { auth, googleProvider } = getFirebase()
              const res = await signInWithPopup(auth, googleProvider)
              await ensureUserDoc(res.user)
              setAuthOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* New Cry Modal */}
      <Dialog open={cryOpen} onOpenChange={setCryOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800 pb-4">
            <DialogTitle className="text-lg font-semibold">New Cry</DialogTitle>
            <DialogDescription className="sr-only">
              Create a new cry entry with location, emotion, and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] px-1">
            <div>
              <div className="text-sm font-semibold mb-2">Location</div>
              <GoogleMapView
                apiKey={GMAPS_KEY}
                center={miniMarker ?? center}
                height={200}
                zoom={12}
                singleMarker={{ ...(miniMarker ?? center), emoji: selectedSticker.emoji }}
                draggable
                onMarkerDrag={(p) => setMiniMarker(p)}
                onMapClick={(p) => setMiniMarker(p)}
              />
              <div className="text-xs text-zinc-400 mt-1 text-center">Tap map to adjust pin location</div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Pick a sticker</div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {stickers.map((s) => {
                  const selected = s.emoji === selectedSticker.emoji
                  return (
                    <button
                      key={s.emoji}
                      type="button"
                      className={cn(
                        "aspect-square rounded-lg text-2xl flex items-center justify-center border transition",
                        selected
                          ? "bg-[var(--accent)] border-[var(--accent)]"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
                      )}
                      title={s.desc}
                      style={{ ["--accent" as any]: ORANGE }}
                      onClick={() => setSelectedSticker(s)}
                    >
                      {s.emoji}
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-zinc-400 mt-2">{selectedSticker.desc}</div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Rate your cry</div>
              <Stars value={rating} onChange={setRating} />
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Date & time</div>
              <div className="bg-zinc-800 rounded-md text-center py-3 text-zinc-300">
                {`Now • ${new Date().toLocaleDateString()} • ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Tag location (optional)</div>
              <Input
                placeholder="E.g. Home, Work, School..."
                className="bg-zinc-800 border-zinc-700 text-white"
                value={locationTag}
                onChange={(e) => setLocationTag(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Description (optional)</div>
              <Textarea
                rows={3}
                placeholder="What made you cry?"
                className="bg-zinc-800 border-zinc-700 text-white"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              className="w-full font-bold"
              style={{ background: `linear-gradient(45deg, ${ORANGE}, #F7931E)` }}
              onClick={saveCry}
            >
              Save Cry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal with ad */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogDescription className="sr-only">Cry placed successfully</DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <div className="text-2xl font-bold text-green-500">Cry Placed Successfully!</div>
            <div className="text-zinc-300">Your emotional journey has been added to the map</div>
            <div className="mt-3">
              <AdSlot slot="5871608851" style={{ display: "inline-block", width: 300, height: 250 }} />
            </div>
            <Button
              className="mt-2 font-bold rounded-full"
              style={{ background: "linear-gradient(45deg, #4CAF50, #45a049)" }}
              onClick={() => setSuccessOpen(false)}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cry Info Bottom Sheet */}
      <div
        className={cn(
          "fixed left-0 right-0 bottom-0 z-[60] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl transition-transform duration-300",
          infoOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ maxHeight: "70vh" }}
        aria-hidden={!infoOpen}
      >
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Cry Details</div>
            <button
              className="text-2xl text-zinc-400 hover:bg-zinc-800 w-8 h-8 rounded-full"
              onClick={() => setInfoOpen(false)}
            >
              {"×"}
            </button>
          </div>
          {viewCry && (
            <>
              <div className="text-center">
                <div className="text-5xl mb-1">{viewCry.emoji}</div>
                <h4 className="font-semibold">{viewCry.name}</h4>
                <div className="text-xs text-zinc-400">{`by @${viewCry.username}`}</div>
                <div className="text-sm text-zinc-300">{viewCry.locationTag || viewCry.country}</div>
                <div className="text-xs text-zinc-500">{new Date(viewCry.timestamp).toLocaleString()}</div>
              </div>

              <div className="flex items-center justify-center mt-2">
                <Stars value={viewCry.rating} onChange={() => {}} readOnly />
              </div>

              {viewCry.description && <p className="text-center text-zinc-300 italic mt-2">{viewCry.description}</p>}

              <div className="grid grid-cols-4 gap-3 mt-4">
                <Button
                  variant="secondary"
                  className={cn(
                    "bg-zinc-800 text-white hover:bg-zinc-700 col-span-1",
                    userLikes[viewCry.id] && "bg-[var(--accent)]",
                  )}
                  style={{ ["--accent" as any]: ORANGE }}
                  onClick={() => toggleLike(viewCry)}
                >
                  <span className="mr-1">{userLikes[viewCry.id] ? "❤️" : "🤍"}</span>
                  {(viewCry.likes?.length ?? 0).toString()}
                </Button>
                <Button
                  variant="secondary"
                  className="bg-zinc-800 text-white hover:bg-zinc-700 col-span-1"
                  onClick={() => setShowComments((s) => !s)}
                >
                  💬 {(viewCry.comments?.length ?? 0).toString()}
                </Button>
                {isLoggedIn && viewCry.userId === user?.uid && (
                  <>
                    <Button
                      variant="secondary"
                      className="bg-zinc-800 text-white hover:bg-zinc-700 col-span-1"
                      onClick={() => {
                        const nr = Math.min(5, (viewCry.rating || 0) + 1)
                        setCries((prev) => prev.map((c) => (c.id === viewCry.id ? { ...c, rating: nr } : c)))
                        setViewCry({ ...viewCry, rating: nr })
                        updateDoc(doc(getFirebase().db, "cries", viewCry.id), { rating: nr }).catch(() => {})
                      }}
                    >
                      ✏️ Edit
                    </Button>
                    <Button variant="destructive" className="col-span-1" onClick={() => deleteCry(viewCry)}>
                      🗑️ Delete
                    </Button>
                  </>
                )}
              </div>

              {showComments && (
                <div className="mt-4">
                  <h4 className="mb-2 font-semibold">Comments</h4>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a comment..."
                      className="bg-zinc-800 border-zinc-700 text-white"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button className="rounded-full font-bold" style={{ background: ORANGE }} onClick={addComment}>
                      Post
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(viewCry.comments || []).length === 0 ? (
                      <div className="text-sm text-zinc-400 text-center">No comments yet. Be the first!</div>
                    ) : (
                      viewCry.comments.map((c) => (
                        <div key={c.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-blue-400">@{c.username}</span>
                            <span className="text-zinc-400">{timeAgo(c.timestamp)}</span>
                          </div>
                          <div className="text-sm text-zinc-200">{c.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Cry Calendar</DialogTitle>
            <DialogDescription className="sr-only">View your cry history on a calendar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                className="bg-zinc-800 text-white hover:bg-zinc-700"
                onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))}
              >
                ◀
              </Button>
              <div className="font-semibold">
                {calendarDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
              <Button
                variant="secondary"
                className="bg-zinc-800 text-white hover:bg-zinc-700"
                onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))}
              >
                ▶
              </Button>
            </div>
            <CalendarGrid monthDate={calendarDate} cries={monthCries} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Cries History/Search Modal */}
      <Dialog open={criesModalOpen} onOpenChange={setCriesModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your Cries</DialogTitle>
            <DialogDescription className="sr-only">Search and view your cry history</DialogDescription>
          </DialogHeader>
          <HistorySearch cries={cries.filter((c) => c.userId === (user?.uid || "anonymous"))} onOpen={openCryInfo} />
        </DialogContent>
      </Dialog>

      {/* Countries Modal */}
      <Dialog open={countriesOpen} onOpenChange={setCountriesOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Countries You&apos;ve Cried In</DialogTitle>
            <DialogDescription className="sr-only">View the countries where you have cried</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {myCountryCounts.length === 0 ? (
              <div className="col-span-full text-center text-zinc-400 py-6">
                No countries yet. Start crying around the world!
              </div>
            ) : (
              myCountryCounts.map(([country, count]) => (
                <div key={country} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                  <div className="text-lg font-semibold">{country}</div>
                  <div className="text-xs text-[var(--accent)] mt-1" style={{ ["--accent" as any]: ORANGE }}>
                    {count} {count === 1 ? "cry" : "cries"}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Achievement Details */}
      <Dialog open={achOpen.open} onOpenChange={(o) => setAchOpen({ open: o, key: achOpen.key })}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogDescription className="sr-only">View achievement details</DialogDescription>
          </DialogHeader>
          {achOpen.key && (
            <div className="text-center">
              <div className="text-6xl my-3">{achDefs[achOpen.key].icon}</div>
              <div className="text-xl font-bold">{achDefs[achOpen.key].name}</div>
              <div className="text-sm text-zinc-400 mt-1">{achDefs[achOpen.key].desc}</div>
              <div className="mt-4">
                <div className="h-2 bg-zinc-700 rounded">
                  <div
                    className="h-full bg-[var(--accent)] rounded"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.floor((achievements[achOpen.key].value / achDefs[achOpen.key].target) * 100),
                      )}%`,
                      ["--accent" as any]: ORANGE,
                    }}
                  />
                </div>
                <div className="text-sm text-[var(--accent)] mt-1" style={{ ["--accent" as any]: ORANGE }}>
                  {achievements[achOpen.key].value}/{achDefs[achOpen.key].target}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={profileEditOpen}
        onOpenChange={setProfileEditOpen}
        user={
          user
            ? {
                username: user.username,
                email: user.email,
                bio: editBio,
                avatarColor: selectedAvatar,
                avatarEmoji: avatarEmoji,
              }
            : null
        }
        onSave={async (data) => {
          if (!user) return

          // Update local state
          setUser((prev) => (prev ? { ...prev, username: data.username } : null))
          setSelectedAvatar(data.avatarColor)
          setAvatarEmoji(data.avatarEmoji)
          setEditBio(data.bio)

          // Update Firestore
          const userRef = doc(getFirebase().db, "users", user.uid)
          await updateDoc(userRef, {
            username: data.username.trim() || user.username,
            bio: data.bio.trim(),
            avatarColor: data.avatarColor,
            avatarEmoji: data.avatarEmoji,
            updatedAt: new Date(),
          })
        }}
      />

      {/* Privacy Settings Modal */}
      <Dialog open={privacySettingsOpen} onOpenChange={setPrivacySettingsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription className="sr-only">Manage your privacy settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Profile Visibility</div>
              <div className="space-y-2">
                {(["public", "friends", "private"] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={profileVisibility === option}
                      onChange={() => setProfileVisibility(option)}
                      className="text-orange-500"
                    />
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <ToggleRow title="Show location in cries" value={showLocation} onChange={setShowLocation} />
            <ToggleRow title="Allow comments on cries" value={allowComments} onChange={setAllowComments} />
            <ToggleRow title="Allow friend requests" value={allowFriendRequests} onChange={setAllowFriendRequests} />

            <Button
              className="w-full font-bold"
              style={{ background: ORANGE }}
              onClick={() => setPrivacySettingsOpen(false)}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Users Modal */}
      <Dialog open={blockedUsersOpen} onOpenChange={setBlockedUsersOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Blocked Users</DialogTitle>
            <DialogDescription className="sr-only">Manage your blocked users</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-zinc-400 py-8">
              <div className="text-4xl mb-2">🚫</div>
              <div className="text-lg font-semibold">No Blocked Users</div>
              <div className="text-sm mt-1">Users you block will appear here</div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Block a User</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username to block"
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                />
                <Button
                  style={{ background: ORANGE }}
                  onClick={() => alert("Block user functionality would be implemented here")}
                >
                  Block
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feed Settings Modal */}
      <Dialog open={feedSettingsOpen} onOpenChange={setFeedSettingsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Feed Settings</DialogTitle>
            <DialogDescription className="sr-only">Manage your feed settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ToggleRow title="Auto-refresh feed" value={autoRefresh} onChange={setAutoRefresh} />
            <ToggleRow
              title="Show emotional insights"
              value={showEmotionalInsights}
              onChange={setShowEmotionalInsights}
            />
            <ToggleRow title="Notify about new cries nearby" value={notifyNewCries} onChange={setNotifyNewCries} />

            <div>
              <div className="text-sm font-semibold mb-2">Feed Radius</div>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white">
                <option value="1">1 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>

            <Button
              className="w-full font-bold"
              style={{ background: ORANGE }}
              onClick={() => setFeedSettingsOpen(false)}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistics Modal */}
      <Dialog open={statisticsOpen} onOpenChange={setStatisticsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Statistics</DialogTitle>
            <DialogDescription className="sr-only">View your statistics</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat card title="Total Cries" value={cries.filter((c) => c.userId === user?.uid).length} />
              <Stat card title="Countries" value={statsCountries} />
              <Stat card title="Avg Rating" value={avgRating} />
              <Stat
                card
                title="Total Likes"
                value={cries.filter((c) => c.userId === user?.uid).reduce((sum, c) => sum + (c.likes?.length || 0), 0)}
              />
            </div>

            {/* Emotion Breakdown */}
            <div>
              <div className="text-lg font-semibold mb-3">Emotion Breakdown</div>
              <div className="grid grid-cols-2 gap-2">
                {stickers.map((sticker) => {
                  const count = cries.filter((c) => c.userId === user?.uid && c.emoji === sticker.emoji).length
                  const percentage =
                    cries.filter((c) => c.userId === user?.uid).length > 0
                      ? Math.round((count / cries.filter((c) => c.userId === user?.uid).length) * 100)
                      : 0
                  return (
                    <div key={sticker.emoji} className="bg-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{sticker.emoji}</span>
                        <span className="text-sm font-medium">{sticker.name}</span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {count} times ({percentage}%)
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time Analysis */}
            <div>
              <div className="text-lg font-semibold mb-3">Activity Over Time</div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <div className="text-sm text-zinc-400 mb-2">Most active day: Monday</div>
                <div className="text-sm text-zinc-400 mb-2">Most active time: 8:00 PM - 10:00 PM</div>
                <div className="text-sm text-zinc-400">
                  Average cries per week: {(weeklyCount(cries, user?.uid || "anonymous", 7) / 1).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={profileCreationOpen}
        onOpenChange={setProfileCreationOpen}
        initialUsername={editUsername}
        onComplete={async (profile) => {
          if (!user) return
          try {
            // Update local state
            setUser((prev) => (prev ? { ...prev, username: profile.username } : null))
            setSelectedAvatar(profile.avatarColor)
            setAvatarEmoji(profile.avatarEmoji)

            // Update Firestore
            const userRef = doc(getFirebase().db, "users", user.uid)
            await updateDoc(userRef, {
              username: profile.username,
              bio: profile.bio,
              avatarColor: profile.avatarColor,
              avatarEmoji: profile.avatarEmoji,
              updatedAt: new Date(),
            })

            setProfileCreationOpen(false)
          } catch (error) {
            console.error("Failed to create profile:", error)
            alert("Failed to create profile. Please try again.")
          }
        }}
      />

      {/* Profile Share Modal */}
      <ProfileShareModal
        open={profileShareOpen}
        onOpenChange={setProfileShareOpen}
        user={
          user
            ? {
                username: user.username,
                avatarColor: selectedAvatar,
                avatarEmoji: avatarEmoji,
              }
            : null
        }
      />

      {/* Premium Modal */}
      <PremiumModal
        open={premiumModalOpen}
        onOpenChange={setPremiumModalOpen}
      />

      {/* Add Friends Modal */}
      <Dialog open={addFriendsOpen} onOpenChange={setAddFriendsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add Friends</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Search for users by username to add them as friends
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search input */}
            <div className="space-y-2">
              <Input
                placeholder="Search by username..."
                className="bg-zinc-800 border-zinc-700 text-white"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchUsers(searchUsername)
                  }
                }}
              />
              <Button
                className="w-full font-semibold"
                style={{ background: ORANGE }}
                onClick={() => searchUsers(searchUsername)}
                disabled={searching || !searchUsername.trim()}
              >
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Search Results</h4>
                {searchResults.map(user => (
                  <div key={user.uid} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: user.avatarColor || ORANGE }}
                      >
                        {user.avatarEmoji || user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">@{user.username}</div>
                        {user.displayName && (
                          <div className="text-xs text-zinc-400">{user.displayName}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        sendFriendRequest(user.uid, user.username)
                        setSearchResults([])
                        setSearchUsername("")
                      }}
                    >
                      Add Friend
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Current friends */}
            {friends.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Your Friends ({friends.length})</h4>
                {friends.map(friend => (
                  <div key={friend.uid} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: friend.avatarColor || ORANGE }}
                      >
                        {friend.avatarEmoji || friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">@{friend.username}</div>
                        {friend.displayName && (
                          <div className="text-xs text-zinc-400">{friend.displayName}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      onClick={() => removeFriend(friend.uid)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NavItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button className="flex flex-col items-center justify-center text-zinc-400 hover:text-white" onClick={onClick}>
      {icon}
      <div className="text-xs mt-1">{label}</div>
    </button>
  )
}

function Stat({
  card,
  title,
  value,
  highlight,
  onClick,
}: { card: true; title: string; value: any; highlight?: boolean; onClick?: () => void }) {
  return (
    <button
      className={cn(
        "bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center transition",
        highlight && "hover:bg-zinc-700 cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </button>
  )
}

function SettingRow({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <div
      className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
      onClick={onClick}
    >
      <div className="font-medium">{title}</div>
      <div className="text-zinc-400 text-xl">›</div>
    </div>
  )
}

function ToggleRow({ title, value, onChange }: { title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50">
      <div className="font-medium">{title}</div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none rounded-full peer dark:bg-zinc-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-orange-500"></div>
      </label>
    </div>
  )
}

function LinkRow({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
    >
      <div className="font-medium">{title}</div>
      <div className="text-zinc-400 text-xl">›</div>
    </a>
  )
}

function AuthForm({
  mode,
  onSwitchMode,
  onEmailSignin,
  onEmailSignup,
  onGoogle,
}: {
  mode: "signin" | "signup"
  onSwitchMode: () => void
  onEmailSignin: (email: string, pass: string) => Promise<void>
  onEmailSignup: (email: string, user: string, pass: string) => Promise<void>
  onGoogle: () => Promise<void>
}) {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
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

  return (
    <div className="space-y-4">
      {mode === "signup" && (
        <div>
          <div className="text-sm font-semibold mb-1">Username</div>
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
          {usernameAvailable === false && <div className="text-xs text-red-400 mt-1">Username is already taken</div>}
          {usernameAvailable === true && <div className="text-xs text-green-400 mt-1">Username is available!</div>}
        </div>
      )}
      <div>
        <div className="text-sm font-semibold mb-2">Email</div>
        <Input
          placeholder="Enter email"
          className="bg-zinc-800 border-zinc-700 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <div className="text-sm font-semibold mb-2">Password</div>
        <Input
          type="password"
          placeholder="Enter password"
          className="bg-zinc-800 border-zinc-700 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button
        className="w-full font-bold"
        style={{ background: ORANGE }}
        onClick={async () => {
          if (mode === "signin") {
            await onEmailSignin(email, password)
          } else {
            await onEmailSignup(email, username, password)
          }
        }}
      >
        {mode === "signin" ? "Sign In" : "Create Account"}
      </Button>
      <div className="text-center text-zinc-400">
        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
        <button type="button" className="text-blue-500 ml-1" onClick={onSwitchMode}>
          {mode === "signin" ? "Create Account" : "Sign In"}
        </button>
      </div>
      <div className="text-center text-zinc-400">Or</div>
      <Button
        variant="outline"
        className="w-full border-zinc-600 text-white hover:bg-zinc-800 bg-transparent"
        onClick={onGoogle}
      >
        Continue with Google
      </Button>
    </div>
  )
}

function Stars({ value, onChange, readOnly }: { value: number; onChange: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="text-2xl text-yellow-500 hover:text-yellow-400 transition-colors"
          onClick={() => !readOnly && onChange(i)}
        >
          {i <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  )
}

function CalendarGrid({ monthDate, cries }: { monthDate: Date; cries: Cry[] }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const firstDayOfWeek = firstDay.getDay() // 0 (Sunday) to 6 (Saturday)
  const weeks: (Cry | null)[][] = []
  let currentWeek: (Cry | null)[] = []

  // Add empty days for the first week to align with the correct day of the week
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add days of the month to the weeks
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const cry = cries.find((c) => {
      const d = new Date(c.timestamp)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })
    currentWeek.push(cry || null)

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Add empty days for the last week to fill it up to 7 days
  while (currentWeek.length < 7) {
    currentWeek.push(null)
  }

  // Add the last week if it's not empty
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="text-center text-xs text-zinc-400">
          {day}
        </div>
      ))}
      {weeks.map((week, i) => (
        <React.Fragment key={i}>
          {week.map((cry, j) => {
            const day = i * 7 + j - firstDayOfWeek + 1
            const valid = day > 0 && day <= daysInMonth
            return (
              <div
                key={j}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center border transition",
                  valid ? "text-white" : "text-zinc-500",
                  cry ? "bg-[var(--accent)] border-[var(--accent)]" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
                )}
                style={{ ["--accent" as any]: ORANGE }}
              >
                {valid ? (cry ? cry.emoji : day) : null}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

function HistorySearch({ cries, onOpen }: { cries: Cry[]; onOpen: (cry: Cry) => void }) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return cries
    return cries.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.locationTag?.toLowerCase().includes(s) ||
        c.country?.toLowerCase().includes(s),
    )
  }, [cries, search])
  return (
    <div className="space-y-3">
      <Input
        placeholder="Search cries..."
        className="bg-zinc-800 border-zinc-700 text-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div className="text-center text-zinc-400 py-6">No cries found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cry) => (
            <div
              key={cry.id}
              className="bg-zinc-800/60 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:bg-zinc-800"
              onClick={() => onOpen(cry)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{cry.emoji}</div>
                <div className="flex-1">
                  <div className="font-semibold">{cry.name}</div>
                  <div className="text-xs text-zinc-400">
                    {cry.locationTag || cry.country} • {timeAgo(cry.timestamp)} • ⭐ {cry.rating}/5
                  </div>
                  {cry.description && <div className="text-sm text-zinc-300 italic mt-1">{`"${cry.description}"`}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function weeklyCount(cries: Cry[], userId: string, days: number): number {
  const now = new Date()
  const then = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const me = cries.filter((c) => c.userId === userId && new Date(c.timestamp) > then)
  return me.length / (days / 7)
}
