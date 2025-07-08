'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Vote, 
  Users, 
  Calendar,
  BarChart3,
  CheckCircle,
  Clock,
  User,
  Plus,
  FileText
} from 'lucide-react'
import { supabase, Election, Candidate, Profile, Vote as VoteType } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

export default function Elections() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<(Candidate & { profile: Profile })[]>([])
  const [userVotes, setUserVotes] = useState<VoteType[]>([])
  const [selectedElection, setSelectedElection] = useState<Election | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [voting, setVoting] = useState(false)
  const [showCandidateForm, setShowCandidateForm] = useState(false)
  const [candidateFormData, setCandidateFormData] = useState({
    post: '',
    manifesto: ''
  })

  const candidatePosts = [
    { value: 'clo', label: 'CLO (Corps Liaison Officer)' },
    { value: 'cds_president', label: 'CDS President' },
    { value: 'financial_secretary', label: 'Financial Secretary' },
    { value: 'general_secretary', label: 'General Secretary' },
    { value: 'marshall_male', label: 'Marshall (Male)' },
    { value: 'marshall_female', label: 'Marshall (Female)' },
    { value: 'provost', label: 'Provost' }
  ]

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && profile) {
      fetchElections()
      fetchCandidates()
      fetchUserVotes()
    }
  }, [user, profile])

  const fetchElections = async () => {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setElections(data || [])
      
      // Set the first active election as selected
      const activeElection = data?.find(e => e.status === 'active')
      if (activeElection) {
        setSelectedElection(activeElection)
      } else if (data && data.length > 0) {
        setSelectedElection(data[0])
      }
    } catch (error) {
      console.error('Error fetching elections:', error)
      toast.error('Failed to fetch elections')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('is_approved', true)
        .order('post', { ascending: true })

      if (error) throw error
      setCandidates(data || [])
    } catch (error) {
      console.error('Error fetching candidates:', error)
    }
  }

  const fetchUserVotes = async () => {
    if (!profile) return
    
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('voter_id', profile.id)

      if (error) throw error
      setUserVotes(data || [])
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }

  const castVote = async (candidateId: string, post: string) => {
    if (!selectedElection || !profile) return

    setVoting(true)
    try {
      // Check if user already voted for this post in this election
      const existingVote = userVotes.find(
        v => v.election_id === selectedElection.id && v.post === post
      )

      if (existingVote) {
        toast.error('You have already voted for this position')
        return
      }

      // Cast the vote
      const { data, error } = await supabase
        .from('votes')
        .insert([{
          election_id: selectedElection.id,
          voter_id: profile.id,
          candidate_id: candidateId,
          post: post
        }])
        .select()

      if (error) throw error

      // Update local state
      setUserVotes([...userVotes, data[0]])
      
      // Update candidate vote count
      setCandidates(candidates.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, votes_count: candidate.votes_count + 1 }
          : candidate
      ))

      toast.success('Vote cast successfully!')
    } catch (error) {
      console.error('Error casting vote:', error)
      toast.error('Failed to cast vote')
    } finally {
      setVoting(false)
    }
  }

  const registerAsCandidate = async () => {
    if (!selectedElection || !profile || !candidateFormData.post) {
      toast.error('Please select a post and provide a manifesto')
      return
    }

    try {
      // Check if user already registered for this post in this election
      const existingCandidate = candidates.find(
        c => c.election_id === selectedElection.id && 
            c.user_id === profile.id && 
            c.post === candidateFormData.post
      )

      if (existingCandidate) {
        toast.error('You have already registered for this position')
        return
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert([{
          election_id: selectedElection.id,
          user_id: profile.id,
          post: candidateFormData.post,
          manifesto: candidateFormData.manifesto,
          is_approved: false // Requires admin approval
        }])
        .select(`
          *,
          profile:profiles(*)
        `)

      if (error) throw error

      setCandidates([...candidates, data[0]])
      setShowCandidateForm(false)
      setCandidateFormData({ post: '', manifesto: '' })
      toast.success('Candidate registration submitted for approval!')
    } catch (error) {
      console.error('Error registering candidate:', error)
      toast.error('Failed to register as candidate')
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const hasVotedForPost = (post: string) => {
    return userVotes.some(
      v => v.election_id === selectedElection?.id && v.post === post
    )
  }

  const getVotedCandidate = (post: string) => {
    const vote = userVotes.find(
      v => v.election_id === selectedElection?.id && v.post === post
    )
    return vote ? candidates.find(c => c.id === vote.candidate_id) : null
  }

  const electionCandidates = selectedElection 
    ? candidates.filter(c => c.election_id === selectedElection.id)
    : []

  // Group candidates by post
  const candidatesByPost = candidatePosts.reduce((acc, post) => {
    acc[post.value] = electionCandidates.filter(c => c.post === post.value)
    return acc
  }, {} as Record<string, typeof electionCandidates>)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
          <p className="text-gray-600 mt-2">Vote for your preferred candidates</p>
        </div>

        {elections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Available</h3>
              <p className="text-gray-600">There are currently no active elections.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Election Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Election</CardTitle>
                <CardDescription>Choose an election to view candidates and cast your vote</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {elections.map((election) => (
                    <motion.div
                      key={election.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all ${
                          selectedElection?.id === election.id 
                            ? 'ring-2 ring-green-500 bg-green-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedElection(election)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{election.title}</h3>
                            <Badge className={getStatusBadgeColor(election.status)}>
                              {election.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{election.description}</p>
                          <div className="text-xs text-gray-500">
                            <div className="flex items-center mb-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(election.start_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Ends: {format(new Date(election.end_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedElection && (
              <Tabs defaultValue="vote" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="vote">Cast Vote</TabsTrigger>
                  {profile?.role === 'candidate' && (
                    <TabsTrigger value="register">Register as Candidate</TabsTrigger>
                  )}
                  <TabsTrigger value="results">Results</TabsTrigger>
                </TabsList>

                {profile?.role === 'candidate' && (
                  <TabsContent value="register">
                    <Card>
                      <CardHeader>
                        <CardTitle>Register as Candidate</CardTitle>
                        <CardDescription>
                          Register for a position in {selectedElection.title}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="post">Select Position</Label>
                          <Select 
                            value={candidateFormData.post} 
                            onValueChange={(value) => setCandidateFormData({ ...candidateFormData, post: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a position" />
                            </SelectTrigger>
                            <SelectContent>
                              {candidatePosts.map((post) => (
                                <SelectItem key={post.value} value={post.value}>
                                  {post.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="manifesto">Manifesto</Label>
                          <Textarea
                            id="manifesto"
                            placeholder="Share your vision and plans for this position..."
                            value={candidateFormData.manifesto}
                            onChange={(e) => setCandidateFormData({ ...candidateFormData, manifesto: e.target.value })}
                            className="min-h-[150px]"
                          />
                        </div>
                        
                        <Button 
                          onClick={registerAsCandidate}
                          disabled={!candidateFormData.post || !candidateFormData.manifesto.trim()}
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Submit Registration
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                <TabsContent value="vote">
                  <div className="space-y-6">
                    {candidatePosts.map((post) => {
                      const postCandidates = candidatesByPost[post.value] || []
                      const hasVoted = hasVotedForPost(post.value)
                      const votedCandidate = getVotedCandidate(post.value)
                      
                      return (
                        <Card key={post.value}>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">{post.label}</CardTitle>
                              {hasVoted && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Voted
                                </Badge>
                              )}
                            </div>
                            <CardDescription>
                              {hasVoted 
                                ? `You voted for ${votedCandidate?.profile?.full_name}`
                                : 'Select your preferred candidate'
                              }
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {postCandidates.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">No candidates for this position</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {postCandidates.map((candidate) => (
                                  <motion.div
                                    key={candidate.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Card 
                                      className={`cursor-pointer transition-all ${
                                        votedCandidate?.id === candidate.id
                                          ? 'ring-2 ring-green-500 bg-green-50'
                                          : hasVoted
                                          ? 'opacity-50 cursor-not-allowed'
                                          : 'hover:shadow-md'
                                      }`}
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-center space-x-3 mb-3">
                                          <Avatar className="h-12 w-12">
                                            <AvatarImage src={candidate.profile?.photo_url} alt={candidate.profile?.full_name} />
                                            <AvatarFallback>{candidate.profile?.full_name?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <h4 className="font-semibold">{candidate.profile?.full_name}</h4>
                                            <p className="text-sm text-gray-600">{candidate.profile?.state_code}</p>
                                          </div>
                                        </div>
                                        
                                        {candidate.manifesto && (
                                          <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                                            {candidate.manifesto}
                                          </p>
                                        )}
                                        
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm text-gray-500">
                                            {candidate.votes_count} votes
                                          </span>
                                          
                                          {selectedElection.status === 'active' && (
                                            <Button
                                              size="sm"
                                              disabled={hasVoted || voting}
                                              onClick={() => castVote(candidate.id, post.value)}
                                              className={
                                                votedCandidate?.id === candidate.id
                                                  ? 'bg-green-600 hover:bg-green-700'
                                                  : ''
                                              }
                                            >
                                              {voting ? 'Voting...' : hasVoted ? 'Voted' : 'Vote'}
                                            </Button>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="results">
                  <Card>
                    <CardHeader>
                      <CardTitle>Election Results</CardTitle>
                      <CardDescription>Real-time voting results for {selectedElection.title}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {candidatePosts.map((post) => {
                          const postCandidates = candidatesByPost[post.value] || []
                          const postTotalVotes = postCandidates.reduce((sum, c) => sum + c.votes_count, 0)
                          
                          return (
                            <div key={post.value} className="border rounded-lg p-4">
                              <h3 className="font-semibold mb-4">{post.label}</h3>
                              
                              {postCandidates.length === 0 ? (
                                <p className="text-gray-500">No candidates for this position</p>
                              ) : (
                                <div className="space-y-3">
                                  {postCandidates
                                    .sort((a, b) => b.votes_count - a.votes_count)
                                    .map((candidate, index) => {
                                      const percentage = postTotalVotes > 0 ? (candidate.votes_count / postTotalVotes) * 100 : 0
                                      
                                      return (
                                        <div key={candidate.id} className="bg-gray-50 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3">
                                              <Avatar className="h-8 w-8">
                                                <AvatarImage src={candidate.profile?.photo_url} alt={candidate.profile?.full_name} />
                                                <AvatarFallback>{candidate.profile?.full_name?.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <p className="font-medium">{candidate.profile?.full_name}</p>
                                                <p className="text-sm text-gray-600">{candidate.profile?.state_code}</p>
                                              </div>
                                              {index === 0 && postTotalVotes > 0 && (
                                                <Badge className="bg-yellow-100 text-yellow-800">Leading</Badge>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <p className="font-semibold">{candidate.votes_count} votes</p>
                                              <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                                            </div>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <motion.div 
                                              className="bg-green-600 h-2 rounded-full"
                                              initial={{ width: 0 }}
                                              animate={{ width: `${percentage}%` }}
                                              transition={{ duration: 1, ease: "easeOut" }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              )}
                              
                              <div className="mt-3 text-sm text-gray-600">
                                Total votes: {postTotalVotes}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  )
}