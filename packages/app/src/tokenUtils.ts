import type { JwtClaims } from '@i-novus/oidc-pkce-public-client'

export function getRoles(token: JwtClaims) {
    let resourceAccess: string[] = []
    let realmAccess: string[] = []

    try {
        // @ts-ignore
        resourceAccess = token.resource_access[token.aud].roles
    } finally {
        resourceAccess = resourceAccess && Array.isArray(resourceAccess) ? resourceAccess : []
    }

    try {
        // @ts-ignore
        realmAccess = token.realm_access.roles
    } finally {
        realmAccess = realmAccess && Array.isArray(realmAccess) ? realmAccess : []
    }

    return [...resourceAccess, ...realmAccess]
}
