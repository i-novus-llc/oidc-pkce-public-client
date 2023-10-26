import { Config } from './types'

export interface StoreParams {
    keyPostfix?: string
}

export interface SetValueStoreParams extends StoreParams {
    expireIn?: number
}

export interface StoredValue<T = unknown> {
    expireIn: number
    value: T
}

// 1 year
const MAX_CACHE = 365 * 24 * 60 * 60 * 1000

export function cleanerStart(config: Config): void {
    const now = Date.now()

    Object.keys(localStorage)
        .filter((key) => key.startsWith(config.storeKeyPrefix))
        .forEach((key) => {
            let removeItem = false

            try {
                const storeValueRaw = window.localStorage.getItem(key)

                if (!storeValueRaw) {
                    removeItem = true

                    return
                }

                const storeValue = JSON.parse(storeValueRaw) as StoredValue

                if (now > storeValue.expireIn) {
                    removeItem = true
                }
            } catch (e) {
                console.error(e)

                removeItem = true
            } finally {
                if (removeItem) {
                    window.localStorage.removeItem(key)
                }
            }
        })

    setTimeout(() => { cleanerStart(config) }, 60 * 1000)
}

export function getStoreKey(config: Config, params: StoreParams = {}): string {
    const { storeKeyPrefix, authority, clientId } = config

    return `${storeKeyPrefix}${params.keyPostfix ?? ''}${authority}/:${clientId}`
}

export function setStoreData<T = unknown>(config: Config, value: T, params: SetValueStoreParams = {}): void {
    const key = getStoreKey(config, params)
    const expireIn = params.expireIn ?? (Date.now() + MAX_CACHE)
    const storeValue:StoredValue<T> = {
        expireIn,
        value,
    }

    window.localStorage.setItem(key, JSON.stringify(storeValue))
}

export function removeStoreData(config: Config, params: StoreParams = {}): void {
    const key = getStoreKey(config, params)

    window.localStorage.removeItem(key)
}

export function getStoreData<T = unknown>(config: Config, params: StoreParams = {}): { expireIn: number, value: T | null } {
    try {
        const key = getStoreKey(config, params)
        const storeValueRaw = window.localStorage.getItem(key)

        if (!storeValueRaw) {
            return { expireIn: 0, value: null }
        }

        const storeValue = JSON.parse(storeValueRaw) as StoredValue<T>

        if (Date.now() >= storeValue.expireIn) {
            window.localStorage.removeItem(key)

            return { expireIn: 0, value: null }
        }

        return storeValue
    } catch (e) {
        console.error(e)

        return { expireIn: 0, value: null }
    }
}
