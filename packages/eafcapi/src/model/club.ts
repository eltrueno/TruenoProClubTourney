
export type TGametype = `${"playoff" | "league"}Match`
export const isGametype = (gametype: unknown): gametype is TGametype => gametype === 'leagueMatch' || gametype === 'playoffMatch'
export interface IRespWrap<T> { [key: string]: T }
// TODO remove use the generisch one
export interface IClubSearchResp { [key: string]: IClubSearch }
export interface IClubInfoResp { [key: string]: IClubInfo }
// export interface IClubStatsResp { [key: string]: IClubStats }
export interface IClubSeasonRankResp { [key: string]: IClubStats }
export interface IClubSearch {
	alltimeGoals: string
	alltimeGoalsAgainst: string
	bestDivision: number
	bestPoints: string
	clubId: string
	clubInfo: IClubInfo
	cupRankingPoints: string
	cupsElim0: string
	cupsElim0R1: string
	cupsElim0R2: string
	cupsElim0R3: string
	cupsElim0R4: string
	cupsElim1: string
	cupsElim1R1: string
	cupsElim1R2: string
	cupsElim1R3: string
	cupsElim1R4: string
	cupsElim2: string
	cupsElim2R1: string
	cupsElim2R2: string
	cupsElim2R3: string
	cupsElim2R4: string
	cupsElim3: string
	cupsElim3R1: string
	cupsElim3R2: string
	cupsElim3R3: string
	cupsElim3R4: string
	cupsElim4: string
	cupsElim4R1: string
	cupsElim4R2: string
	cupsElim4R3: string
	cupsElim4R4: string
	cupsElim5: string
	cupsElim5R1: string
	cupsElim5R2: string
	cupsElim5R3: string
	cupsElim5R4: string
	cupsElim6: string
	cupsElim6R1: string
	cupsElim6R2: string
	cupsElim6R3: string
	cupsElim6R4: string
	cupsWon0: string
	cupsWon1: string
	cupsWon2: string
	cupsWon3: string
	cupsWon4: string
	cupsWon5: string
	cupsWon6: string
	currentDivision: number
	curSeasonMov: string
	divsWon1: number
	divsWon2: number
	divsWon3: number
	divsWon4: number
	gamesPlayed: string
	goals: string
	goalsAgainst: string
	holds: string
	lastMatch0: string
	lastMatch1: string
	lastMatch2: string
	lastMatch3: string
	lastMatch4: string
	lastMatch5: string
	lastMatch6: string
	lastMatch7: string
	lastMatch8: string
	lastMatch9: string
	lastOpponent0: string
	lastOpponent1: string
	lastOpponent2: string
	lastOpponent3: string
	lastOpponent4: string
	lastOpponent5: string
	lastOpponent6: string
	lastOpponent7: string
	lastOpponent8: string
	lastOpponent9: string
	leaguesWon: string
	losses: string
	maxDivision: string
	name: string
	overallRankingPoints: string
	points: string
	prevDivision: string
	prevPoints: string
	prevProjectedPts: string
	prevSeasonLosses: string
	prevSeasonTies: string
	prevSeasonWins: string
	projectedPoints: number
	promotions: string
	rankingPoints: string
	recentResults: RecentResult[]
	relegations: string
	seasonLosses: string
	seasons: number
	seasonTies: string
	seasonWins: string
	skill: string
	starLevel: string
	ties: string
	titlesWon: string
	totalCupsWon: number
	totalGames: number
	wins: string
}
export interface IClubInfo {
	clubId: number
	customKit: ICustomKit
	name: string
	regionId: number
	teamId: number
}
export interface ICustomKit {
	crestAssetId: string
	crestColor: string
	customAwayKitId: string
	customKeeperKitId?: string
	customKitId: string
	dCustomKit: string
	isCustomTeam: string
	kitAColor1: string
	kitAColor2: string
	kitAColor3: string
	kitColor1: string
	kitColor2: string
	kitColor3: string
	kitId: string
	stadName: string
}
export enum RecentResult {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Empty = '',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Losses = 'losses',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Ties = 'ties',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	WINS = 'wins',
}
/* export interface IClubStats {
	agreggateRecord: string
	averageGoalsAgainstPerGame: string
	averageGoalsPerGame: string
	beststreak: string
	cleanSheets: string
	clubId: string
	clubname: string
	currCompPts: string
	currPerfPts: string
	eqTCompPts: string
	eqTPerfPts: string
	friends: string
	gamesPlayed: string
	goals: string
	goalsAgainst: string
	losses: string
	opponentLevel: string
	opponentSkillPoints: string
	overallSkillPoints: string
	prevCompPts: string
	prevOpponentSkillPoints: string
	prevPerfPts: string
	ptsGainedThisLevel: string
	ptsTillNextLevel: string
	rank: string
	result1: string
	result2: string
	result3: string
	result4: string
	result5: string
	skill: string
	skillPrev: string
	starLevel: string
	ties: string
	unbeatenstreak: string
	wins: string
	winsCup: string
	wstreak: string
} */
export interface IClubStats {
	alltimeGoals: string
	alltimeGoalsAgainst: string
	bestDivision: number
	bestPoints: string
	clubId: string
	cupRankingPoints: string
	cupsElim0: string
	cupsElim0R1: string
	cupsElim0R2: string
	cupsElim0R3: string
	cupsElim0R4: string
	cupsElim1: string
	cupsElim1R1: string
	cupsElim1R2: string
	cupsElim1R3: string
	cupsElim1R4: string
	cupsElim2: string
	cupsElim2R1: string
	cupsElim2R2: string
	cupsElim2R3: string
	cupsElim2R4: string
	cupsElim3: string
	cupsElim3R1: string
	cupsElim3R2: string
	cupsElim3R3: string
	cupsElim3R4: string
	cupsElim4: string
	cupsElim4R1: string
	cupsElim4R2: string
	cupsElim4R3: string
	cupsElim4R4: string
	cupsElim5: string
	cupsElim5R1: string
	cupsElim5R2: string
	cupsElim5R3: string
	cupsElim5R4: string
	cupsElim6: string
	cupsElim6R1: string
	cupsElim6R2: string
	cupsElim6R3: string
	cupsElim6R4: string
	cupsWon0: string
	cupsWon1: string
	cupsWon2: string
	cupsWon3: string
	cupsWon4: string
	cupsWon5: string
	cupsWon6: string
	currentDivision: number
	curSeasonMov: string
	divsWon1: number
	divsWon2: number
	divsWon3: number
	divsWon4: number
	gamesPlayed: string
	goals: string
	goalsAgainst: string
	holds: string
	lastMatch0: string
	lastMatch1: string
	lastMatch2: string
	lastMatch3: string
	lastMatch4: string
	lastMatch5: string
	lastMatch6: string
	lastMatch7: string
	lastMatch8: string
	lastMatch9: string
	lastOpponent0: string
	lastOpponent1: string
	lastOpponent2: string
	lastOpponent3: string
	lastOpponent4: string
	lastOpponent5: string
	lastOpponent6: string
	lastOpponent7: string
	lastOpponent8: string
	lastOpponent9: string
	leaguesWon: string
	losses: string
	maxDivision: string
	overallRankingPoints: string
	points: string
	prevDivision: string
	prevPoints: string
	prevProjectedPts: string
	prevSeasonLosses: string
	prevSeasonTies: string
	prevSeasonWins: string
	projectedPoints: number
	promotions: string
	rankingPoints: string
	recentResults: RecentResult[]
	relegations: string
	seasonLosses: string
	seasons: number
	seasonTies: string
	seasonWins: string
	skill: string
	starLevel: string
	ties: string
	titlesWon: string
	totalCupsWon: number
	totalGames: number
	wins: string
}
// export interface IClubSeasonStats
export interface IClubMemberCareer {
	assists: string
	favoritePosition: string
	gamesPlayed: string
	goals: string
	manOfTheMatch: string
	name: string
	proPos: string
	ratingAve: string
}
export interface IClubMemberStats {
	assists: string
	cleanSheetsDef: string
	cleanSheetsGK: string
	favoritePosition: string
	gamesPlayed: string
	goals: string
	manOfTheMatch: string
	name: string
	passesMade: string
	passSuccessRate: string
	proHeight: string
	proName: string
	proNationality: string
	proOverall: string
	proPos: string
	proStyle: string
	redCards: string
	shotSuccessRate: string
	tacklesMade: string
	tackleSuccessRate: string
	winRate: string

}
export interface IClubMatches {
	aggregate: { [key: string]: { [key: string]: number } }
	clubs: { [key: string]: IMatchClub }
	matchId: string
	players: { [key: string]: { [key: string]: IMatchClubPlayer } }
	timeAgo: TimeAgo
	timestamp: number
}
export interface IMatchClub {
	details: IClubInfo
	gameNumber: string
	goals: string
	goalsAgainst: string
	losses: string
	result: string
	score: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	season_id: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	TEAM: string
	ties: string
	winnerByDnf: string
	wins: string
}
export interface IMatchClubPlayer {
	assists: string
	cleansheetsany: string
	cleansheetsdef: string
	cleansheetsgk: string
	goals: string
	goalsconceded: string
	losses: string
	mom: string
	passattempts: string
	passesmade: string
	playername: string
	pos: Pos
	rating: string
	realtimegame: string
	realtimeidle: string
	redcards: string
	saves: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	SCORE: string
	shots: string
	tackleattempts: string
	tacklesmade: string
	vproattr: string
	vprohackreason: string
	wins: string
}
export enum Pos {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Defender = 'defender',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Empty = '',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Forward = 'forward',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Goalkeeper = 'goalkeeper',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Midfielder = 'midfielder',
}
export interface TimeAgo {
	number: number
	unit: string
}
