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

import { ApiError } from '../lib/api/client';

export interface TranslateApiErrorOverrides {
    codes?: Record<string, string>;
    statuses?: Record<number, string>;
}

export const translateApiError = (error: unknown, overrides?: TranslateApiErrorOverrides): string => {
    if (error instanceof ApiError) {
        // 0. Mapeo prioritario personalizado (overrides)
        if (overrides?.codes && error.code && overrides.codes[error.code]) {
            return overrides.codes[error.code];
        }

        // 1. Mapeo por código de error específico del backend
        const codeMap: Record<string, string> = {
            'UNAUTHORIZED': 'No tienes permiso para realizar esta acción',
            'FORBIDDEN': 'Acceso denegado. Permisos insuficientes',
            'NOT_FOUND': 'El recurso que buscas no existe',
            'VALIDATION_ERROR': 'Los datos proporcionados no son válidos',
            'CONFLICT': 'Existe un conflicto con los datos enviados',
            'UNKNOWN_ERROR': 'Ha ocurrido un error inesperado en el servidor'
        };

        if (error.code && codeMap[error.code]) {
            return codeMap[error.code];
        }

        // Overrides para HTTP status
        if (overrides?.statuses && overrides.statuses[error.httpStatus]) {
            return overrides.statuses[error.httpStatus];
        }

        // 2. Mapeo por código de estado HTTP (fallback)
        const statusMap: Record<number, string> = {
            400: 'Petición incorrecta. Revisa los datos enviados.',
            401: 'Inicia sesión para continuar.',
            403: 'No tienes los permisos necesarios',
            404: 'Contenido no encontrado',
            409: 'Conflicto al procesar la petición',
            422: 'Datos inválidos',
            500: 'Problema interno del servidor. Inténtalo más tarde',
            503: 'Servicio no disponible temporalmente'
        };

        if (statusMap[error.httpStatus]) {
            return statusMap[error.httpStatus];
        }

        // 3. Fallback al mensaje nativo o un genérico
        return error.message || 'Error de conexión con el servidor.';
    }

    if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Load failed')) {
            return 'No se pudo conectar con el servidor. Revisa tu conexión a internet o intentalo de nuevo más tarde.';
        }
        return error.message;
    }

    return 'Ocurrió un error desconocido';
}
