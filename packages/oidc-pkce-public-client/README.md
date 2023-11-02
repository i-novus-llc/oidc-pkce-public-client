# OIDC клиент public-типа с поддержкой PKCE для react-приложений

npm-пакет `@i-novus/oidc-pkce-public-client` предназначен для использования в `react 17+` приложениях, где необходима авторизация через OAuth сервер с использованием публичного (public) клиента (confidential не поддерживается).


## Минимальный пример использования

```tsx
// index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { OidcClient, OidcContextProvider } from '@i-novus/oidc-pkce-public-client'
import { App } from './App'

async function start() {
    // Создаем экземпляр OIDC клиента
    const oidcClient = new OidcClient({
        // ToDo: Вставить свои значения
        authority: 'https://some-oauth-server/auth/realms/realm-name/',
        clientId: 'oidc-client-id',
    })

    // Сначала нужно асинхронно инициализировать клиент
    await oidcClient.init()

    const appRootEl = document.getElementById('root')

    if (appRootEl) {
        // Рендерим провайдер OIDC-контекста
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
```

```tsx
// App.tsx
import React, { FC } from 'react'
import { useOidcContext } from '@i-novus/oidc-pkce-public-client'

export const App: FC = () => {
    // Получение методов и данных из OIDC контекста
    const { login, logout, accessToken, rawParsedToken } = useOidcContext()
    
    console.log(accessToken, rawParsedToken)

    return (
        <div>
            {
                accessToken && rawParsedToken
                    ? (
                        <div>
                            <span>Авторизован</span>
                            <button type="button" onClick={() => logout()}>Выйти</button>
                        </div>
                    )
                    : (
                        <div>
                            <span>Неавторизован</span>
                            <button type="button" onClick={() => login()}>Авторизоваться</button>
                        </div>
                    )
            }
        </div>
    )
}
```


## Расширенный пример использования

```tsx
// index.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { OidcClient, OidcContextProvider, jwtDecode } from '@i-novus/oidc-pkce-public-client'
import { App } from './App'

async function start() {
    const oidcClient = new OidcClient({
        // ToDo: Вставить свои значения
        authority: 'https://some-oauth-server/auth/realms/realm-name/',
        clientId: 'oidc-client-id',
        scope: 'openid email roles',
        pkce: false, // Не использовать PKCE
    })

    await oidcClient.init()
    // Можно заставить начать авторизовывать пользователя при попадании на страницу
    // Полезно для приложений в которых могут работать только авторизовыанные пользователи 
    await oidcClient.login()

    // Можно подписаться на события login, logout и accessTokenUpdated
    // login/logout генерируются на текущей вкладке браузера только если это произошло в другой вкладке
    oidcClient.on('login', () => {
        console.log('LoggedIn')
    })

    oidcClient.on('logout', () => {
        console.log('LoggedOut')
    })

    oidcClient.on('accessTokenUpdated', (accessToken) => {
        console.log('Token updated', accessToken)
    })

    // В любом месте можно получить bearer-токены, если пользователь авторизован (или null)
    const { accessToken } = oidcClient.getUserTokens()
    console.log(accessToken)
    // При помощи предоставленых утилит можно декодировать токен 
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
```


## Параметры OidcClient

| Параметр       | Тип                   | Обязательность | По умолчанию         | Описание                                                                                                                                             |
|----------------|-----------------------|:--------------:|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| authority      | string                |       +        | -                    | Ссылка на oauth сервер с реалмом. Пример: https://some-oauth-server/auth/realms/realm-name/                                                          | 
| clientId       | string                |       +        | -                    | id клиента                                                                                                                                           |
| responseMode   | query &#124; fragment |                | query                | Формат передачи данных с oauth сервера приложению в ответ на авторизацию пользователем. `query` - в виде query параметров и `fragment` - в виде хеша | 
| scope          | string                |                | openid               | scope данных токена, например `openid email roles`                                                                                                   | 
| pkce           | boolean               |                | true                 | Нужно ли использовать функцию [PKCE](https://oauth.net/2/pkce/). true - нужно испльзовать                                                            | 
| logoutBackUrl  | string                |                | window.location.href | url. на который будет переход после логаута                                                                                                          | 
| storeKeyPrefix | string                |                | OIDC-MIF:            | Префикс ключей в LocalStorage для хранения данных oidc-pkce-public-client                                                                            | 


## Установка зависимостей

Перед выполнением скриптов необходимо установить зависимости. В корне выполните команду:

```shell
yarn install
```

Требуется глобально установленный `yarn`. Использоваться автоматически будет `yarn@v3` из папки `.yarn/releases`


## Скрипты `package.json`

`yarn run dev:watch` Запускает в watch-режиме сборку кода библиотека в режиме разработки на http://localhost:8081/

`yarn run build` Запускает сборку кода библиотеки в продуктивном режиме

`yarn run lint` Запускает проверку качества кода библиотеки


## License

[Apache-2.0](./LICENSE)
