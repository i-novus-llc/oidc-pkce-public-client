import type { JwtClaims } from '@i-novus/oidc-pkce-public-client'

export function getRoles(token: JwtClaims) {
    const tokenPart = token as unknown as {
        realm_access?: { roles?: string[] };
        resource_access?: Record<string, { roles?: string[] }>
    }
    let resourceAccess: string[] = []
    let realmAccess: string[] = []

    const resourceRoles = tokenPart?.resource_access?.[token.aud]?.roles

    if (Array.isArray(resourceRoles)) {
        resourceAccess = resourceRoles
    }

    const realmRoles = tokenPart?.realm_access?.roles

    if (Array.isArray(realmRoles)) {
        realmAccess = realmRoles
    }

    return [...resourceAccess, ...realmAccess]
}
