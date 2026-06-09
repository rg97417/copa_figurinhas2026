'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FigurinhaData {
  name: string
  photo: string | null
  birthDay: string
  birthMonth: string
  birthYear: string
  email: string
  club: string
  weight: string
  height: string
  stickerUrl: string | null
  jobId: string | null
}

interface FigurinhaStore extends FigurinhaData {
  setName: (v: string) => void
  setPhoto: (v: string | null) => void
  setBirthDay: (v: string) => void
  setBirthMonth: (v: string) => void
  setBirthYear: (v: string) => void
  setEmail: (v: string) => void
  setClub: (v: string) => void
  setWeight: (v: string) => void
  setHeight: (v: string) => void
  setStickerUrl: (v: string | null) => void
  setJobId: (v: string | null) => void
  setAll: (data: FigurinhaData) => void
  reset: () => void
}

const initial: FigurinhaData = {
  name: '',
  photo: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  email: '',
  club: '',
  weight: '',
  height: '',
  stickerUrl: null,
  jobId: null,
}

export const useFigurinhaStore = create<FigurinhaStore>()(
  persist(
    (set) => ({
      ...initial,
      setName: (name) => set({ name }),
      setPhoto: (photo) => set({ photo }),
      setBirthDay: (birthDay) => set({ birthDay }),
      setBirthMonth: (birthMonth) => set({ birthMonth }),
      setBirthYear: (birthYear) => set({ birthYear }),
      setEmail: (email) => set({ email }),
      setClub: (club) => set({ club }),
      setWeight: (weight) => set({ weight }),
      setHeight: (height) => set({ height }),
      setStickerUrl: (stickerUrl) => set({ stickerUrl }),
      setJobId: (jobId) => set({ jobId }),
      setAll: (data) => set(data),
      reset: () => set(initial),
    }),
    {
      name: 'figurinha-copa-2026',
    }
  )
)

export function getPlayerNumber(name: string): number {
  if (!name) return 10
  const hash = name
    .toUpperCase()
    .split('')
    .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
  return (Math.abs(hash) % 23) + 1
}

export function formatBirthDate(day: string, month: string, year: string): string {
  if (!day || !month || !year) return ''
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
}
