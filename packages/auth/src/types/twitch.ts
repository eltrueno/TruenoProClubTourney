export interface TwitchUser {
  id: string
  display_name: string
  profile_image_url: string
}

export interface TwitchTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface TwitchSyncResult {
  twitchFollowing: boolean
  twitchSub: boolean
  twitchSubTier: string | null
  role: string
}
