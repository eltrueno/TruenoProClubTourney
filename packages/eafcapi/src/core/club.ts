import { IClubInfo, IClubMatches, IClubMemberCareer, IClubMemberStats, IClubSearch, IClubStats, TGametype } from './../model/club'
import { getParam, getParamExt, TPlatformType } from './api'

// function* values(obj: Record<string, unknown>) { if (obj) { for (const prop of Object.keys(obj)) { yield obj[prop] } } }
/* export const getfifa19ClubIdByName = async (query: string) => {
	const res = await getfifa19(`clubsComplete/${query}`)
	return (res as Record<string, unknown>)?.clubId
}
export const getfifa19ClubMembers = async (clubId: number) => {
	const res = await getfifa19(`clubs/${clubId}/members`)
	return Array.from(values(res as Record<string, unknown>))
}
export const getfifa19ClubMemberStats = (clubId: number) => get(`clubs/${clubId}/membersComplete`)
export const getfifa19ClubSeasonRank = (clubId: number) => get(`clubs/${clubId}/seasonRank`)
export const getfifa19ClubSeasonStats = (clubId: number) => get(`clubs/${clubId}/seasonalStats`)
export const getfifa19ClubStats = (clubId: number) => get(`clubs/${clubId}/stats`)
export const getfifa19ClubMatchHistory = (clubId: number) => get(`clubs/${clubId}/matches`)
export const getfifa19ClubInfo = (clubId: number) => get(`clubs/${clubId}/info`) */

export const getClubSearch = (platform: TPlatformType, query: string) => getParamExt<IClubSearch>(platform, 'clubs/search', { clubName: query })
export const getClubIdByName = async (platform: TPlatformType, query: string) => (await getClubSearch(platform, query))?.[0]?.clubInfo?.clubId
export const getClubMembers = (platform: TPlatformType, clubId: number) => getParam<IClubMemberStats[]>(platform, 'members/stats', { clubId, clubIds: clubId })
export const getClubMemberStats = (platform: TPlatformType, clubId: number) => getParam<IClubMemberCareer[]>(platform, 'members/career/stats', { clubId, clubIds: clubId })
export const getClubStats = (platform: TPlatformType, clubId: number) => getParam<IClubStats>(platform, 'clubs/overallStats', { clubId, clubIds: clubId })
export const getClubPlayoffAchievements = (platform: TPlatformType, clubId: number) => getParam<IClubStats>(platform, 'clubs/playoffAchievements', { clubId, clubIds: clubId })
/* export const getClubSeasonStats = (platform: TPlatformType, clubId: number) => getParam<IClubStats>(platform, 'clubs/seasonalStats', { clubId, clubIds: clubId }) */
/* export const getClubStats = (platform: TPlatformType, clubId: number, gameType: TGametype) =>
	getParam<IClubStats>(platform, 'clubs/stats', { clubId, clubIds: clubId, matchType: gameType, maxResultCount: 10 }) */
export const getClubMatchHistory = (platform: TPlatformType, clubId: number, gameType: TGametype) =>
	getParamExt<IClubMatches>(platform, 'clubs/matches', { clubId, clubIds: clubId, matchType: gameType, maxResultCount: 10 })
export const getClubInfo = (platform: TPlatformType, clubId: number) => getParam<IClubInfo>(platform, 'clubs/info', { clubId, clubIds: clubId })