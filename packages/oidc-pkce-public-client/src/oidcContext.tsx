import React, { createContext, useContext, FC, PropsWithChildren, useEffect, useState } from 'react'

import { OidcContext, Login, Logout } from './types'
import { OidcClient, LoginHandler, LogoutHandler, AccessTokenUpdatedHandler } from './OidcClient'
import { jwtDecode } from './jwtUtils'

export const oidcContext = createContext<OidcContext>({
    login: (() => {
        throw new Error('Node not inside <OidcContextProvider>')
    }) as Login,
    logout: (() => {
        throw new Error('Node not inside <OidcContextProvider>')
    }) as Logout,
    accessToken: null,
    rawParsedToken: null,
})

export const OidcContextProvider: FC<PropsWithChildren<{ oidcClient: OidcClient }>> = ({ oidcClient, children }) => {
    const [oidcContextValue, setOidcContextValue] = useState<OidcContext>(() => {
        const { accessToken } = oidcClient.getUserTokens()
        const rawParsedToken = accessToken === null ? null : jwtDecode(accessToken)

        return ({
            login: oidcClient.login,
            logout: oidcClient.logout,
            accessToken,
            rawParsedToken,
        })
    })

    useEffect(() => {
        const loginHandler: LoginHandler = (accessToken) => {
            const rawParsedToken = jwtDecode(accessToken)

            setOidcContextValue({
                login: oidcClient.login,
                logout: oidcClient.logout,
                accessToken,
                rawParsedToken,
            })
        }
        const logoutHandler: LogoutHandler = () => {
            setOidcContextValue({
                login: oidcClient.login,
                logout: oidcClient.logout,
                accessToken: null,
                rawParsedToken: null,
            })
        }
        const accessTokenUpdatedHandler: AccessTokenUpdatedHandler = (accessToken, oldAccessToken) => {
            if (accessToken === oldAccessToken) {
                return
            }

            const rawParsedToken = jwtDecode(accessToken)

            setOidcContextValue({
                login: oidcClient.login,
                logout: oidcClient.logout,
                accessToken,
                rawParsedToken,
            })
        }

        oidcClient.on('login', loginHandler)
        oidcClient.on('logout', logoutHandler)
        oidcClient.on('accessTokenUpdated', accessTokenUpdatedHandler)

        return () => {
            oidcClient.off('login', loginHandler)
            oidcClient.off('logout', logoutHandler)
            oidcClient.off('accessTokenUpdated', accessTokenUpdatedHandler)
        }
    }, [oidcClient])

    return (
        <oidcContext.Provider value={oidcContextValue}>
            {children}
        </oidcContext.Provider>
    )
}

export const useOidcContext = () => useContext(oidcContext)
