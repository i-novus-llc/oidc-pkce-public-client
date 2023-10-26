# Приложение для демонстрации возможностей `@i-novus/oidc-pkce-public-client`  

npm-пакет `@i-novus/oidc-pkce-public-client` предназначен для использования в `react 17+`  приложениях, где необходима авторизация через oauth сервер с использованием публичного (public) клиента (confidential не поддерживается)   

## ENV - переменные

В корне web-приложения расположен файл `.env.example` его нужно скопировать и положить рядом с именем `.env` или `.env.local`, после чего указать необходимые параметры:


### Обязательные параметры

`VITE_AUTHORITY` Тут необходимо указать oauth сервер с реалмом (authority). Ссылка будет выглядеть похожей на https://some-oauth-server/auth/realms/realm-name/

`VITE_CLIENT_ID` Тут необходимо указать id клиента (client_id)


### Необязательные параметры

`VITE_SCOPE` Тут можно указать scope данных (scope), например `openid email roles`. По умолчанию `openid` 

`VITE_RESPONSE_MODE` Тут можно указать формат передачи данных с oauth сервера приложению в ответ на авторизацию пользователем (response_mode). Доступные значения: `query` (в виде query параметров) и `fragment` (в виде хеша). По умолчанию `query`

`VITE_PKCE` Использовать функцию PKCE или нет. Доступные значения: `true` (с PKCE) и `false` (без PKCE). По умолчанию `true`


### Параметры, которые используются, но изменить нельзя

`subjectType` = `public`

`responseType` = `code`

`grantType` = `authorization_code`

`tokenSigningAlg` = `RS256`


## Установка зависимостей

Перед выполнением скриптов необходимо установить зависимости. В корне моноремы выполните команду:

```yarn install```

Требуется глобально установленный `yarn`. Использоваться автоматически будет `yarn@v3` из папки `.yarn/releases`


## Скрипты `package.json`

`yarn run dev` Запускает приложение в режиме разработки на http://localhost:8081/ с функцией hot reload

`yarn run build` Запускает сборку кода (он появится в папке `dist`)

`yarn run start` Запускает приложение в продуктивном режиме на http://localhost:8081/

`yarn run lint` Запускает проверку кода на соответствие правилам


## License

[Apache-2.0](./LICENSE)
