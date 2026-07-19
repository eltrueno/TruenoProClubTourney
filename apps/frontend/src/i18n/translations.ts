export enum Position {
    midfielder = "midfielder",
    forward = "forward",
    defender = "defender",
    goalkeeper = "goalkeeper",
}

export enum Result {
    loose = "loose",
    tie = "tie",
    win = "win"
}

export enum Role {
    admin = "admin",
    vip = "vip",
    follower = "follower",
    visitor = "visitor",
    subscriber = "subscriber"
}


export const translateMatchResult = (result: Result | string): string => {
    const map: Record<Result, string> = {
        [Result.loose]: "Derrota",
        [Result.tie]: "Empate",
        [Result.win]: "Victoria"
    };
    return map[result as Result] || result;
}

export const translateRole = (role: Role | string): string => {
    const map: Record<Role, string> = {
        [Role.admin]: "Admin",
        [Role.vip]: "VIP",
        [Role.follower]: "Seguidor",
        [Role.visitor]: "Visitante",
        [Role.subscriber]: "Suscriptor"
    };
    return map[role as Role] || role;
}

export const translatePosition = (position: Position | string): string => {
    const map: Record<Position, string> = {
        [Position.midfielder]: "Centrocampista",
        [Position.forward]: "Delantero",
        [Position.defender]: "Defensa",
        [Position.goalkeeper]: "Portero"
    };
    return map[position as Position] || position;
}
