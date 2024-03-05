import React, { FC } from 'react'
import { OidcClient, useOidcContext } from '@i-novus/oidc-pkce-public-client'

import { sleep } from './util'
import { getRoles } from './tokenUtils'

export const App: FC = () => {
    const { login, logout, accessToken, rawParsedToken } = useOidcContext()

    console.log('App render')

    return (
        <div>
            {
                accessToken && rawParsedToken
                    ? (
                        <div>
                            <span>logged</span>
                            <pre>
                                {JSON.stringify(getRoles(rawParsedToken))}
                            </pre>
                            <button
                                type="button"
                                onClick={() => (
                                    logout({
                                        async beforeLogout(oidcClient: OidcClient) {
                                            await sleep(1000)

                                            console.log(`On before logging out ${oidcClient.getUserTokens().idToken}`)
                                        },
                                    })
                                )}
                            >
                                Logout (((
                            </button>
                            <pre>
                                {JSON.stringify(rawParsedToken, null, 4)}
                            </pre>
                            <pre>
                                {JSON.stringify(getRoles(rawParsedToken), null, 4)}
                            </pre>
                        </div>
                    )
                    : (
                        <div>
                            <span>Yo! (((</span>
                            <button type="button" onClick={() => login()}>Login!</button>
                        </div>
                    )
            }
        </div>
    )
}
