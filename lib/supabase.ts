import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for all database tables
export interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string
  photo_url?: string
  date_of_birth?: string
  institution?: string
  course?: string
  state_code?: string
  phone?: string
  ppa?: string
  department?: string
  bio?: string
  role: 'voter' | 'candidate' | 'executive' | 'super_admin'
  is_graduated: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface HeroSlide {
  id: string
  title: string
  description?: string
  image_url: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface JobScholarship {
  id: string
  title: string
  description?: string
  image_url?: string
  external_link?: string
  deadline?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  title: string
  description?: string
  image_url?: string
  images?: string[]
  activity_date?: string
  category: string
  status: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AboutSection {
  id: string
  official:string
  section_type: string
  title: string
  description?: string
  image_url?: string
  name?: string
  position?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PhotoGallery {
  id: string
  title: string
  description?: string
  image_url: string
  event_tag: string
  upload_date: string
  uploaded_by?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Election {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'completed'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  election_id: string
  user_id: string
  post: string
  manifesto?: string
  is_approved: boolean
  votes_count: number
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  election_id: string
  voter_id: string
  candidate_id: string
  post: string
  created_at: string
}

export interface Suggestion {
  id: string
  content: string
  category: string
  is_anonymous: boolean
  reactions_count: number
  created_at: string
  updated_at: string
}

export interface SuggestionReaction {
  id: string
  suggestion_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_active: boolean
  expires_at?: string
  created_at: string
  updated_at: string
}