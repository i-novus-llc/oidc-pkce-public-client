import { v4 as uuid4 } from 'uuid'
import sha256 from 'crypto-js/sha256'
import Base64Url from 'crypto-js/enc-base64url'

import { Config, OidcClientConfig, OidcMetadataConfig, LoginCallbackSessionStorageData, TokenResponse, Login, Logout } from './types'
import { SetValueStoreParams, setStoreData, getStoreData, cleanerStart, removeStoreData, getStoreKey } from './store'
import { getTabStoreData, setTabStoreData } from './tabStore'
import { jwtDecode } from './jwtUtils'

export type LoginHandler = (accessToken: string) => void
export type LogoutHandler = () => void
export type AccessTokenUpdatedHandler = (accessToken: string, oldAccessToken: string) => void
type EventType = 'login' | 'logout' | 'accessTokenUpdated'

const AccessTokenKeyPostfix = 'access_token:'
const RefreshTokenKeyPostfix = 'refresh_token:'
const IdTokenKeyPostfix = 'id_token:'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE

export class OidcClient {
    /**
     * Конфиг клиента
     */
    config: Config

    /**
     * Признак завершенной инициализации клиента. События будут генерироваться только если инициализация завершена
     */
    initialised = false

    events: Record<EventType, unknown[]> = {
        login: [],
        logout: [],
        accessTokenUpdated: [],
    }

    constructor(oidcClientConfig: OidcClientConfig) {
        this.config = OidcClient.getConfig(oidcClientConfig)
    }

    on(event: 'login', handler: LoginHandler): this
    on(event: 'logout', handler: LogoutHandler): this
    on(event: 'accessTokenUpdated', handler: AccessTokenUpdatedHandler): this
    on(event: EventType, handler: unknown) {
        const events = this.events[event] as unknown[]
        const position = events.indexOf(handler)

        if (position === -1) {
            events.push(handler)
        }

        return this
    }

    off(event: 'login', listener: LoginHandler): this
    off(event: 'logout', listener: LogoutHandler): this
    off(event: 'accessTokenUpdated', listener: AccessTokenUpdatedHandler): this
    off(event: EventType, handler: unknown) {
        const position = (this.events[event] as unknown[]).indexOf(handler)

        if (position >= 0) {
            this.events[event].splice(position, 1)
        }

        return this
    }

    emit(event: 'login', ...params: Parameters<LoginHandler>): this
    emit(event: 'logout', ...params: Parameters<LogoutHandler>): this
    emit(event: 'accessTokenUpdated', ...params: Parameters<AccessTokenUpdatedHandler>): this
    emit(event: EventType, ...args: unknown[]) {
        const events = this.events[event] as unknown[]

        // @ts-ignore
        events.forEach((handler) => handler(...args))

        return this
    }

    /**
     * Возвращает полный конфиг на основе пользовательского
     * @param config
     */
    static getConfig(config: OidcClientConfig): Config {
        const ALLOWED_RESPONSE_MODE_LIST: Config['responseMode'][] = ['query', 'fragment']
        const finalConfig: Config = ({
            subjectType: 'public',
            authority: config.authority.trim().replace(/\/+$/, ''),
            clientId: config.clientId,
            responseType: 'code',
            responseMode: config.responseMode ?? 'query',
            grantType: 'authorization_code',
            tokenSigningAlg: 'RS256',
            scope: config.scope ?? 'openid',
            logoutBackUrl: config.logoutBackUrl ?? window.location.href,
            storeKeyPrefix: config.storeKeyPrefix ?? 'OIDC-MIF:',
            pkce: config.pkce ?? true,
        })

        if (!finalConfig.authority) {
            throw new Error('CONFIG: authority is not set')
        }

        if (!finalConfig.clientId) {
            throw new Error('CONFIG: clientId is not set')
        }

        if (!finalConfig.responseMode) {
            throw new Error('CONFIG: responseMode is not set')
        }

        if (!ALLOWED_RESPONSE_MODE_LIST.includes(finalConfig.responseMode)) {
            throw new Error(`CONFIG: responseMode is "${finalConfig.responseMode}", but accepted only one of "${ALLOWED_RESPONSE_MODE_LIST.join('", "')}"`)
        }

        if (!finalConfig.storeKeyPrefix) {
            throw new Error('CONFIG: storeKeyPrefix is not set')
        }

        return finalConfig
    }

    /**
     * Возвращает конфиг oauth сервера
     */
    async getMetadataConfig(): Promise<OidcMetadataConfig> {
        const storeParams: SetValueStoreParams = {
            keyPostfix: 'METADATA:',
            expireIn: Date.now() + 12 * HOUR,
        }

        const { value } = getStoreData<OidcMetadataConfig>(this.config, storeParams)

        if (value !== null) {
            return value
        }

        const { authority, grantType, responseType, subjectType, tokenSigningAlg, responseMode } = this.config
        const res = await fetch(`${authority}/.well-known/openid-configuration`)

        if (!res.ok || res.status !== 200) {
            throw new Error(`METADATA: Getting OpenID configuration is failed. Error (${res.status}): ${await res.text()}`)
        }

        const metadata: OidcMetadataConfig = await res.json()
        const {
            authorization_endpoint,
            token_endpoint,
            end_session_endpoint,
            grant_types_supported,
            response_types_supported,
            subject_types_supported,
            id_token_signing_alg_values_supported,
            response_modes_supported,
        } = metadata

        if (!authorization_endpoint) {
            throw new Error('METADATA: authorization_endpoint is not set')
        }

        if (!token_endpoint) {
            throw new Error('METADATA: token_endpoint is not set')
        }

        if (!end_session_endpoint) {
            throw new Error('METADATA: end_session_endpoint is not set')
        }

        if (!grant_types_supported || !grant_types_supported.length) {
            throw new Error('METADATA: grant_types_supported is not set or empty')
        }

        if (!grant_types_supported.includes(grantType)) {
            throw new Error(`METADATA: grant type "${grantType}" is not supported. Available only "${grant_types_supported.join('", "')}"`)
        }

        if (!response_types_supported || !response_types_supported.length) {
            throw new Error('METADATA: response_types_supported is not set or empty')
        }

        if (!response_types_supported.includes(responseType)) {
            throw new Error(`METADATA: response type "${responseType}" is not supported. Available only "${response_types_supported.join('", "')}"`)
        }

        if (!subject_types_supported || !subject_types_supported.length) {
            throw new Error('METADATA: subject_types_supported is not set or empty')
        }

        if (!subject_types_supported.includes(subjectType)) {
            throw new Error(`METADATA: subject type "${subjectType}" is not supported. Available only "${subject_types_supported.join('", "')}"`)
        }

        if (!id_token_signing_alg_values_supported || !id_token_signing_alg_values_supported.length) {
            throw new Error('METADATA: id_token_signing_alg_values_supported is not set or empty')
        }

        if (!id_token_signing_alg_values_supported.includes(tokenSigningAlg)) {
            throw new Error(`METADATA: token signing algorithm "${tokenSigningAlg}" is not supported. Available only "${id_token_signing_alg_values_supported.join('", "')}"`)
        }

        if (!response_modes_supported || !response_modes_supported.length) {
            throw new Error('METADATA: response_modes_supported is not set or empty')
        }

        const availableResponseModes = (['query', 'fragment'] as OidcMetadataConfig['response_modes_supported']).filter((responseMode) => response_modes_supported.includes(responseMode))

        if (!availableResponseModes.includes(responseMode)) {
            throw new Error(`METADATA: response mode "${responseMode}" is not supported. Available only "${availableResponseModes.join('", "')}"`)
        }

        setStoreData<OidcMetadataConfig>(this.config, metadata, storeParams)

        return metadata
    }

    /**
     * Возвращает промежуточные данные авторизации, если произошел редирект с oauth сервера. Опирается на url
     */
    getLoginCallbackData(): { responseId: string | null, responseCode: string | null } {
        const { responseMode } = this.config

        let responseId: string | null = null
        let responseCode: string | null = null

        switch (responseMode) {
            case 'query': {
                const { searchParams } = new URL(window.location.href)

                responseId = searchParams.get('state')
                responseCode = searchParams.get('code')

                break
            }
            case 'fragment': {
                let { hash } = window.location

                if (hash && hash.startsWith('#')) {
                    hash = decodeURIComponent(hash.substring(1))

                    const pairs = hash.split('&')
                    const params: Record<string, string> = {}

                    pairs.forEach((pair) => {
                        const [key, ...valueParts] = pair.split('=')

                        params[key!] = valueParts.join('=')
                    })

                    if (params.state && params.code) {
                        responseId = params.state
                        responseCode = params.code
                    }
                }

                break
            }
            default:
                throw new Error(`INIT: Unknown response mode type "${responseMode}"`)
        }

        return { responseId, responseCode }
    }

    /**
     * Инициализирует клиент
     */
    async init(): Promise<void> {
        cleanerStart(this.config)
        const { responseId, responseCode } = this.getLoginCallbackData()

        if (responseId && responseCode) {
            const loginData = getTabStoreData<LoginCallbackSessionStorageData>(this.config, { id: responseId })

            if (!loginData) {
                throw new Error(`LOGIN CALLBACK: Data not found for id:${responseId}`)
            }

            const { grantType, clientId, pkce } = this.config
            const { token_endpoint } = await this.getMetadataConfig()
            const { codeVerifier, redirectUri } = loginData

            const payload = new URLSearchParams()

            payload.append('grant_type', grantType)
            payload.append('redirect_uri', redirectUri)
            payload.append('code', responseCode)
            payload.append('client_id', clientId)

            if (pkce) {
                payload.append('code_verifier', codeVerifier)
            }

            const res = await fetch(
                token_endpoint,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: payload.toString(),
                },
            )

            if (!res.ok || res.status !== 200) {
                throw new Error(`LOGIN CALLBACK: Getting authorization token is failed. Error (${res.status}): ${await res.text()}`)
            }

            const tokenResponse: TokenResponse = await res.json() as TokenResponse

            if (tokenResponse.token_type !== 'bearer') {
                throw new Error(`LOGIN CALLBACK: Token is not bearer type. Actual: ${tokenResponse.token_type}`)
            }

            this.setUserTokens(tokenResponse)

            window.location.assign(redirectUri)

            // Wait for redirect
            await new Promise(() => {})
        }

        await this.refreshAccessTokenLoop()

        this.initialised = true

        window.addEventListener('storage', (event) => {
            if (event.type === 'storage' && event.storageArea === window.localStorage) {
                const key = getStoreKey(this.config, { keyPostfix: AccessTokenKeyPostfix })

                if (key === event.key) {
                    const { accessToken } = this.getUserTokens()

                    if (!event.oldValue && accessToken) {
                        this.emit('login', accessToken)
                    } else if (event.oldValue && !accessToken) {
                        this.emit('logout')
                    } else if (event.oldValue && accessToken && event.oldValue !== accessToken) {
                        this.emit('accessTokenUpdated', accessToken, event.oldValue)
                    }
                }
            }
        })
    }

    /**
     * Делает login, если пользователь не авторизован
     * @param redirectUri
     */
    login: Login = async (redirectUri: string = window.location.href): Promise<void> => {
        const { responseId, responseCode } = this.getLoginCallbackData()

        if (responseId || responseCode) {
            console.error('Login cant be done cause code or state params present in url')

            return
        }

        const { accessToken, refreshToken } = this.getUserTokens()

        if (accessToken || refreshToken) {
            return
        }

        const { clientId, responseType, scope, tokenSigningAlg, responseMode, pkce } = this.config
        const { authorization_endpoint } = await this.getMetadataConfig()
        const id = uuid4()

        const codeVerifier = uuid4() + uuid4() + uuid4()

        const hashed = sha256(codeVerifier)
        const codeChallenge = Base64Url.stringify(hashed)

        const loginUrl = new URL(authorization_endpoint)

        loginUrl.searchParams.append('client_id', clientId)
        loginUrl.searchParams.append('redirect_uri', redirectUri)
        loginUrl.searchParams.append('response_type', responseType)
        loginUrl.searchParams.append('response_mode', responseMode)
        loginUrl.searchParams.append('scope', scope)
        loginUrl.searchParams.append('state', id)

        if (pkce) {
            loginUrl.searchParams.append('code_challenge', codeChallenge)
            loginUrl.searchParams.append('code_challenge_method', tokenSigningAlg)
        }

        const tabStoredData: LoginCallbackSessionStorageData = {
            action: 'login',
            id,
            codeVerifier,
            redirectUri,
        }

        setTabStoreData(this.config, tabStoredData, { id })

        window.location.assign(loginUrl.href)

        // Wait for redirect
        await new Promise(() => {})
    }

    /**
     * Делает logout, если пользователь авторизован
     */
    logout: Logout = async (): Promise<void> => {
        const { refreshToken, idToken } = this.getUserTokens()

        if (!refreshToken) {
            return
        }

        const { logoutBackUrl } = this.config
        const { end_session_endpoint } = await this.getMetadataConfig()
        const loginUrl = new URL(end_session_endpoint)

        loginUrl.searchParams.append('id_token_hint', idToken!)
        loginUrl.searchParams.append('post_logout_redirect_uri', logoutBackUrl)

        this.removeUserTokens()

        window.location.assign(loginUrl.href)

        // Wait for redirect
        await new Promise(() => {})
    }

    /**
     * В бесконечном цикле проверяет, нужно ли обновить токены
     */
    refreshAccessTokenLoop = async () => {
        try {
            const { accessTokenExpireIn, refreshToken } = this.getUserTokens()
            const accessTokenExpireSoon = (accessTokenExpireIn - Date.now()) <= 30 * SECOND

            if (accessTokenExpireSoon && refreshToken) {
                const pending = this.isRefreshRequestsPending()

                if (!pending) {
                    const { token_endpoint } = await this.getMetadataConfig()
                    const { clientId, scope } = this.config
                    const payload = new URLSearchParams()

                    payload.append('grant_type', 'refresh_token')
                    payload.append('refresh_token', refreshToken)
                    payload.append('scope', scope)
                    payload.append('client_id', clientId)

                    const res = await fetch(
                        token_endpoint,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: payload.toString(),
                        },
                    )

                    if (res.ok && res.status === 200) {
                        const tokenResponse: TokenResponse = await res.json() as TokenResponse

                        this.setUserTokens(tokenResponse)
                    } else {
                        this.removeUserTokens()
                    }
                }
            }
        } catch (e) {
            console.error(`REFRESH TOKEN: ${e}`)
        }

        setTimeout(this.refreshAccessTokenLoop, 10 * SECOND)
    }

    /**
     * Устанавливает актуальные токены. Запускает события login или accessTokenUpdated, в зависимости от предыдущего состояния
     * @param tokenResponse объект с токенами
     */
    setUserTokens(tokenResponse: TokenResponse): void {
        const { access_token, refresh_token, id_token } = tokenResponse
        const { accessToken: oldAccessToken } = this.getUserTokens()

        setStoreData(
            this.config,
            access_token,
            {
                keyPostfix: AccessTokenKeyPostfix,
                expireIn: OidcClient.getTokenExpireIn(access_token),
            },
        )

        setStoreData(
            this.config,
            refresh_token,
            {
                keyPostfix: RefreshTokenKeyPostfix,
                expireIn: OidcClient.getTokenExpireIn(refresh_token),
            },
        )

        setStoreData(
            this.config,
            id_token,
            {
                keyPostfix: IdTokenKeyPostfix,
                expireIn: OidcClient.getTokenExpireIn(id_token),
            },
        )

        if (this.initialised) {
            if (!oldAccessToken) {
                this.emit('login', tokenResponse.access_token)
            } else if (oldAccessToken !== tokenResponse.access_token) {
                this.emit('accessTokenUpdated', tokenResponse.access_token, oldAccessToken)
            }
        }
    }

    /**
     * Возвращает timestamp, когда токен устареет
     * @param token
     */
    static getTokenExpireIn(token: string): number {
        const tokenExpiresIn = jwtDecode(token).exp

        return tokenExpiresIn * SECOND
    }

    /**
     * Удаляет текущие токены, фактически делает logout
     */
    removeUserTokens() {
        const { accessToken: oldAccessToken } = this.getUserTokens()

        removeStoreData(this.config, { keyPostfix: AccessTokenKeyPostfix })
        removeStoreData(this.config, { keyPostfix: RefreshTokenKeyPostfix })
        removeStoreData(this.config, { keyPostfix: IdTokenKeyPostfix })

        if (this.initialised && oldAccessToken) {
            this.emit('logout')
        }
    }

    /**
     * Получает текущие токены
     */
    getUserTokens(): {
        accessTokenExpireIn: number,
        accessToken: string | null,
        refreshToken: string | null,
        idToken: string | null,
    } {
        const {
            expireIn: accessTokenExpireIn,
            value: accessToken,
        } = getStoreData<string>(this.config, { keyPostfix: AccessTokenKeyPostfix })
        const { value: refreshToken } = getStoreData<string>(this.config, { keyPostfix: RefreshTokenKeyPostfix })
        const { value: idToken } = getStoreData<string>(this.config, { keyPostfix: IdTokenKeyPostfix })

        return ({ accessTokenExpireIn, accessToken, refreshToken, idToken })
    }

    /**
     * Проверяет, есть ли активные запросы обновления токена с других вкладок
     */
    isRefreshRequestsPending(): boolean {
        const params: SetValueStoreParams = { keyPostfix: 'refreshLock', expireIn: Date.now() + 10 * SECOND }
        const { value: isRefreshPending } = getStoreData<true>(this.config, params)

        if (isRefreshPending === true) {
            return true
        }

        setStoreData<true>(this.config, true, params)

        return false
    }
}
