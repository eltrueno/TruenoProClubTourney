import { IClubRankLeaderboard } from './../model/leaderboard'
import { getExt, TPlatformType } from './api'

export const getSeasonLeaderboard = (platform: TPlatformType) => getExt<IClubRankLeaderboard>(platform, 'seasonRankLeaderboard')
export const getOverallLeaderboard = (platform: TPlatformType) => getExt<IClubRankLeaderboard>(platform, 'clubRankLeaderboard')
// export const getfifa19SeasonLeaderboard = () => getfifa19('seasonRankLeaderboard')
// export const getfifa19OverallLeaderboard = () => getfifa19('clubRankLeaderboard')

