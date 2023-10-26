import { Config } from './types'

export interface TabStoreParams {
    id: string
}

export function getTabStoreKey(config: Config, params: TabStoreParams) {
    const { storeKeyPrefix } = config
    const { id } = params

    return `${storeKeyPrefix}${id}`
}

export function setTabStoreData<T = unknown>(config: Config, value: T, params: TabStoreParams) {
    const key = getTabStoreKey(config, params)

    window.sessionStorage.setItem(key, JSON.stringify(value))
}

export function getTabStoreData<T = unknown>(config: Config, params: TabStoreParams): T | null {
    try {
        const key = getTabStoreKey(config, params)
        const storeValueRaw = window.sessionStorage.getItem(key)

        if (!storeValueRaw) {
            return null
        }

        return JSON.parse(storeValueRaw) as T
    } catch (e) {
        console.error(e)

        return null
    }
}
