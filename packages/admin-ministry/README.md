# Плагин админки Ministry

`@go-cms/admin-ministry` добавляет экран управления общим справочником порталов Mosreg. Это отдельный плагин для самостоятельного хоста админки; он не добавляет бизнес-функции в универсальное приложение автоматически.

Установите пакет в проект хоста вместе с совместимой версией `@go-cms/admin`, затем подключите экспортированный плагин при старте:

```ts
import { mountAdmin } from '@go-cms/admin/app'
import ministryAdminPlugin from '@go-cms/admin-ministry'
import '@go-cms/admin/app.css'
import '@go-cms/admin-ministry/style.css'

mountAdmin({ target: '#app', plugins: [ministryAdminPlugin] })
```

Для обычной конфигурации проектного хоста пример есть в [admin/README.md проекта Mosreg](https://github.com/vernal96/go-cms-example/tree/main/admin).

Реестр порталов общий для всех сайтов. Плагин использует management API:

- `GET /api/ministry/portals?q=...` — список `{items: [...]}`; поиск по названию и URL.
- `POST /api/ministry/portals` — создать запись.
- `GET /api/ministry/portals/{id}` — прочитать запись.
- `PUT /api/ministry/portals/{id}` — обновить запись.
- `DELETE /api/ministry/portals/{id}` — удалить запись.

Тело create/update содержит `title`, `url` и `is_public`. Название должно быть непустым, URL — абсолютным HTTP или HTTPS адресом. Каждая запись возвращает `id`, `title`, `url`, `is_public`. Для чтения/записи сервер требует глобальные разрешения `ministry.portal.read`, `.create`, `.update` и `.delete`; доступ не зависит от выбранного сайта. Публичные страницы выводят только опубликованные записи через проектный виджет порталов.
