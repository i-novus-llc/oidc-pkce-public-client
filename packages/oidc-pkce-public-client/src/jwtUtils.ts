import { jwtDecode as jwt_decode } from 'jwt-decode'

import { JwtClaims } from './types'

export function jwtDecode(token: string) {
    try {
        return jwt_decode<JwtClaims>(token)
    } catch (err) {
        throw new Error(`JWT DECODE: ${err}`)
    }
}
