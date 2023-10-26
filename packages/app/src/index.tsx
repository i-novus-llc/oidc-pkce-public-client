import React from 'react'
import { createRoot } from 'react-dom/client'
import { OidcClient, OidcContextProvider, jwtDecode } from '@i-novus/oidc-pkce-public-client'

import { oidcClientConfig } from './config'
import { App } from './App'

async function start() {
    const oidcClient = new OidcClient(oidcClientConfig)

    await oidcClient.init()
    await oidcClient.login()

    oidcClient.on('login', () => {
        console.log('LoggedIn')
    })

    oidcClient.on('logout', () => {
        console.log('LoggedOut')
    })

    oidcClient.on('accessTokenUpdated', (accessToken) => {
        console.log('Token updated', accessToken)
    })

    const { accessToken } = oidcClient.getUserTokens()

    console.log(accessToken)

    if (accessToken) {
        console.log(jwtDecode(accessToken))
    }

    const appRootEl = document.getElementById('root')

    if (appRootEl) {
        createRoot(appRootEl).render(
            <OidcContextProvider oidcClient={oidcClient}>
                <App/>
            </OidcContextProvider>,
        )
    }
}

start().catch((e) => {
    console.error(e)
})
