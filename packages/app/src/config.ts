import { OidcClientConfig } from '@i-novus/oidc-pkce-public-client'

const authority: string = import.meta.env.VITE_AUTHORITY ?? ''
const clientId: string = import.meta.env.VITE_CLIENT_ID ?? ''
const scope: string = import.meta.env.VITE_SCOPE
const responseMode: string = import.meta.env.VITE_RESPONSE_MODE
const pkceStr: string = import.meta.env.VITE_PKCE

if (!authority) {
    throw new Error('VITE_AUTHORITY is not set in .env')
}

if (!clientId) {
    throw new Error('VITE_CLIENT_ID is not set in .env')
}

const oidcClientConfig: OidcClientConfig = { authority, clientId }

if (scope) {
    oidcClientConfig.scope = scope
}

if (responseMode) {
    oidcClientConfig.responseMode = responseMode as OidcClientConfig['responseMode']
}

oidcClientConfig.pkce = pkceStr ? pkceStr === 'true' : true

export { oidcClientConfig }
