# Jomini Gaming — Current Frontend Implementation

This document captures the full state of the existing **Jomini Gaming** (a.k.a. `jomini-enterprise`) frontend as it exists today. It is intended to be paired with the backend documentation and fed to an AI that will produce an implementation plan for a rewrite.

---

## 1. Product Overview

Jomini Gaming is an **in-game currency / top-up shop** that resells virtual currency (diamonds, UC, WC, etc.) for four mobile games:

| Code | Game | In-game currency |
|------|------|------------------|
| `mlbb` | Mobile Legends: Bang Bang | Diamonds |
| `pubg` | PUBG Mobile | UC |
| `wr` | Wild Rift | Wild Cores (WC) |
| `ff` | Free Fire | Diamonds |

The **frontend serves two very different audiences from the same single-page app**:

1. **Operators / admins** (whitelisted Firebase users only) — they log in and use a dashboard that:
   - Shows a live feed of incoming customer orders (via a Firestore realtime listener).
   - Lets them process, edit, archive, reject, and refund orders.
   - Lets them manage stock status, create manual orders, generate one-time customer order URLs, publish payment announcements and set Smile.one vendor credentials.
   - Lets them browse Smile.one supplier transaction history to reconcile.

2. **End customers** (unauthenticated) — they receive a short-lived URL (`/external_order/:externalId`) typically handed out by a Messenger bot (FlowXO) or manually by an admin. The URL opens a minimal form to:
   - Pick the game, enter their in-game ID, amount, paid amount, and upload a payment screenshot.
   - Submit the order, which lands in the Firestore `order` collection and shows up in the operator dashboard.

Additionally a `/bot` route simply wraps the FlowXO-hosted chatbot in an iframe (`https://fxo.io/m/licensed-access-6788`) for marketing / Open-Graph link sharing purposes.

There is also a legacy `README.md` that only says *"bookit - A facilities booking system"* — this is **stale and should be ignored**. The current app has nothing to do with booking facilities.

---

## 2. Tech Stack

### 2.1 Runtime / framework

| Concern | Choice | Version |
|---------|--------|---------|
| UI framework | **Vue 3** (Composition API, some Options API via `vue-class-component`) | `^3.0.0` |
| Router | `vue-router` | `^4.0.0-0` |
| State management | `vuex` | `^4.0.0-0` |
| Build tooling | **Vue CLI 5 beta** (`@vue/cli-service ~5.0.0-beta.4`) | webpack-based |
| Language | TypeScript | `~4.1.5`, `"strict": true` |
| PWA | `@vue/cli-plugin-pwa` + `register-service-worker` | yes |
| Mobile shell (unused in prod) | **Ionic Vue** + **Capacitor 3** (Android only) | scaffolded but app is served as a web SPA |

### 2.2 Styling

- **SCSS** (`sass`, `sass-loader`) — most components use `<style scoped lang="scss">` with BEM-ish class names (e.g. `.order__card`, `.order__info`, `.manage__config`).
- **Bootstrap 5 (beta)** utilities imported via `@import "bootstrap/scss/bootstrap-utilities.scss"` in `src/global.scss`. Used mostly for `d-flex`, `fs-*`, margin/padding helpers.
- **Tailwind CSS 2** and **PostCSS / Autoprefixer** are configured (`tailwind.config.js`, `postcss.config.js`) but the three `@tailwind` directives in `src/app.vue` are **commented out**, so Tailwind is effectively dormant.
- **FontAwesome** (`@fortawesome/fontawesome-svg-core`, `free-solid-svg-icons`, `vue-fontawesome` 3.x) — icons are registered globally in `src/main.ts`. Icons used: `spinner, user, compass, scroll, user-cog, chevron-right, chevron-left, file-alt, check-circle, times-circle, file-archive, play-circle, edit, strikethrough, times`.
- **FirebaseUI** default stylesheet (`firebaseui/dist/firebaseui.css`) is imported in both `main.ts` and `modules/firebase.ts`.

### 2.3 Data / backend integration

- **Firebase JS SDK 8** (`firebase@^8.2.7`) — the *compat* / namespaced style (`firebase.firestore()`, `firebase.auth()`).
  Services actually initialised: **Auth**, **Firestore**. Storage / Database / Messaging / Functions are imported but commented out in `modules/firebase.ts`.
- **FirebaseUI** (`firebaseui@^4.7.3`) renders the sign-in widget.
- **Axios** `^0.21.1` — all REST calls go through `src/network/index.ts`. The global `baseURL` comes from `VUE_APP_HTTP_BACKEND_BASEURL` and every request is automatically auth’d with the current user’s Firebase ID token (set as the `Authorization` header in `firebase.auth().onIdTokenChanged`).
- **Firebase Functions** exist as a scaffold only (`functions/src/index.ts` is fully commented out, and `functions/lib/index.js` ships an old placeholder). **No real Cloud Functions are deployed by this repo** — all business logic lives in the separate backend at `VUE_APP_HTTP_BACKEND_BASEURL`.

### 2.4 Utilities & misc dependencies

| Package | Why it’s here |
|---------|---------------|
| `lodash` (`debounce` specifically) | debouncing the Smile.one history day-offset input |
| `shortid` | declared in `global.d.ts`; not actively imported anywhere in `src/` |
| `geofire-common`, `@googlemaps/js-api-loader`, `@types/google.maps` | **legacy dependencies** from the "bookit" era; not actually imported anywhere |
| `@capacitor/*` (`app`, `haptics`, `keyboard`, `status-bar`, `android`, `core`) | Android shell; not used at runtime in the web bundle |
| `@popperjs/core` | Bootstrap dropdown/tooltip dependency; no direct use |
| `bootstrap` | utilities only (see above) |
| `vue-inner-image-zoom` | declared in `global.d.ts`; not imported |
| `vue-class-component` | used only by `bottom-bar.vue` |
| `axios` | HTTP client |
| `core-js` | polyfills via babel preset |

### 2.5 Tooling

- **ESLint** configs: `plugin:vue/recommended`, `@vue/standard`, `@vue/typescript/recommended`. Custom rule relaxations: `no-debugger: off`, `no-explicit-any: off`, `explicit-module-boundary-types: off`, `no-var-requires: off`.
- **Jest** with `@vue/cli-plugin-unit-jest` preset.
- **Cypress** for e2e (only the starter `tests/e2e/specs/example.spec.ts` exists).
- **lint-staged** + `vue-cli-service lint` as a pre-commit hook (via `gitHooks`).
- **Babel** preset `@vue/cli-plugin-babel/preset`.

### 2.6 Environment variables

Both `.env.development.local` and `.env.production.local` are present in the repo (they are **not** gitignored in practice). Values below are **real values that ship with the repo**, reproduced verbatim.

```env
# .env.development.local
VUE_APP_API_KEY=AIzaSyATwThJkue2PjaQCCrGDUHv_Zu_yJ_looA
VUE_APP_AUTH_DOMAIN=jomini-enterprise.firebaseapp.com
VUE_APP_DATABASE_URL=https://jomini-enterprise.firebaseio.com
VUE_APP_PROJECT_ID=jomini-enterprise
VUE_APP_STORAGE_BUCKET_ID=jomini-enterprise.appspot.com
VUE_APP_MESSAGING_SENDER_ID=422021333460
VUE_APP_APP_ID=1:422021333460:web:f69df45e670755cf2c5641
VUE_APP_MESSAGING_VAPID_KEY=BKkq1J3QbjKVsus2O1AiUf28763e_fiJhwAjca6YORSrCWFcnnX3D2rGZJrCxJIbw4xKenzw_RJnR3VOFUsEyN0
VUE_APP_HTTP_BACKEND_BASEURL=http://localhost:8080/
```

```env
# .env.production.local
VUE_APP_API_KEY=AIzaSyATwThJkue2PjaQCCrGDUHv_Zu_yJ_looA
VUE_APP_AUTH_DOMAIN=jomini-enterprise.firebaseapp.com
VUE_APP_DATABASE_URL=https://jomini-enterprise.firebaseio.com
VUE_APP_PROJECT_ID=jomini-enterprise
VUE_APP_STORAGE_BUCKET_ID=jomini-enterprise.appspot.com
VUE_APP_MESSAGING_SENDER_ID=422021333460
VUE_APP_APP_ID=1:422021333460:web:f69df45e670755cf2c5641
VUE_APP_MESSAGING_VAPID_KEY=BKkq1J3QbjKVsus2O1AiUf28763e_fiJhwAjca6YORSrCWFcnnX3D2rGZJrCxJIbw4xKenzw_RJnR3VOFUsEyN0
VUE_APP_HTTP_BACKEND_BASEURL=https://jomini-enterprise.et.r.appspot.com
```

Note: the Firebase Messaging VAPID key is configured in env but the code never actually initialises messaging — Cloud Messaging is effectively not hooked up in the frontend.

---

## 3. Project layout

```
jomini-enterprise/
├── .env.development.local        # local dev env (localhost:8080 backend)
├── .env.production.local         # prod env (GAE backend)
├── .firebaserc                   # firebase project = jomini-enterprise
├── .github/                      # (empty / workflows dir only)
├── android/                      # Capacitor-generated Android project (not used in web deploy)
├── babel.config.js               # @vue/cli-plugin-babel/preset
├── capacitor.config.ts           # appId=io.ionic.starter, webDir=dist
├── cypress.json                  # Cypress config (plugins file only)
├── database.rules.json           # Firebase RTDB — read/write both false (RTDB unused)
├── firebase.json                 # hosting + functions + firestore + rtdb + storage + emulators
├── firestore.indexes.json        # empty: no custom indexes
├── firestore.rules               # require logged-in AND whitelisted in /allowedUser/{uid}
├── storage.rules                 # logged-in can read; no writes
├── functions/                    # Firebase Functions project (placeholder, nothing exported)
├── ionic.config.json             # ionic "vue" type, integrations.capacitor
├── package.json                  # see deps above
├── postcss.config.js             # tailwind + autoprefixer
├── public/
│   ├── favicon.ico
│   ├── index.html                # OG meta for "Jomini Gaming" branding
│   ├── meta-image-jg-logo.jpg
│   └── robots.txt
├── remoteconfig.template.json    # empty {} — remote config unused
├── src/
│   ├── app.vue                   # root layout: router-view + conditional <BottomBar>
│   ├── main.ts                   # createApp, install plugins, axios.baseURL, FA icons
│   ├── global.d.ts               # module shims
│   ├── global.scss               # bootstrap utils + .btn overrides
│   ├── registerServiceWorker.ts  # PWA SW registration (prod only)
│   ├── shims-vue.d.ts            # typing for .vue imports
│   ├── type.ts                   # enum Game { MLBB, PUBG, WR, FF }
│   ├── assets/                   # bg images per game + loading.gif + kaching.mp3 + logo
│   ├── components/
│   │   ├── bottom-bar.vue        # tab-bar (Order / History / Manage / Account)
│   │   ├── modal.vue             # v-model-driven modal, slots: header/content/footer
│   │   └── sidebar.vue           # unused sidebar component (not referenced anywhere)
│   ├── modules/
│   │   └── firebase.ts           # initialises firebase, auth watcher, loggedIn(), logOut(), renderLoginUI()
│   ├── network/
│   │   └── index.ts              # axios wrappers for every backend endpoint
│   ├── router/
│   │   └── index.ts              # route table + beforeEach auth guard
│   ├── store/
│   │   ├── index.ts              # vuex root store, modules={user, report}
│   │   ├── user.ts               # UserState module (namespaced)
│   │   └── report.ts             # ReportState module (namespaced)
│   └── views/
│       ├── account.vue
│       ├── auto-process.vue
│       ├── bot.vue
│       ├── external-order.vue
│       ├── history.vue
│       ├── login.vue
│       ├── manage.vue
│       ├── order.vue
│       ├── server-error.vue
│       └── unauthorized.vue
├── tailwind.config.js            # purges src/**/*.{vue,js,ts,jsx,tsx}
├── tests/
│   ├── e2e/                      # Cypress starter (plugins/specs/support)
│   └── unit/example.spec.ts
├── tsconfig.json                 # strict, paths: { "@/*": ["src/*"] }
└── vue.config.js                 # pwa.name = jomini-enterprise
```

### 3.1 TypeScript path aliasing

`tsconfig.json` registers `"@/*": ["src/*"]`. All non-relative imports in the codebase use this alias (`@/store`, `@/modules/firebase`, `@/network`, `@/type`, etc.).

### 3.2 Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `yarn serve` | `vue-cli-service serve --mode development --port 1202` |
| `yarn build` | `vue-cli-service build --mode production --modern` |
| `yarn test:unit` | `vue-cli-service test:unit` |
| `yarn test:e2e` | `vue-cli-service test:e2e` (Cypress) |
| `yarn lint` | `vue-cli-service lint` |

Dev server port: **1202**.

---

## 4. Runtime architecture

### 4.1 Bootstrap sequence

`src/main.ts` does:

1. `createApp(App)`
2. Register `store` (Vuex) and `router` (Vue Router).
3. Globally register `FontAwesomeIcon` with a curated icon library.
4. Import `firebaseui/dist/firebaseui.css`.
5. Set `axios.defaults.baseURL = process.env.VUE_APP_HTTP_BACKEND_BASEURL`.
6. Mount on `#app`.

`src/modules/firebase.ts` is imported transitively from `router/index.ts`. On import it immediately runs `init()` which:

1. Calls `firebase.initializeApp({...})` using the `VUE_APP_*` Firebase keys.
2. Registers `firebase.auth().onIdTokenChanged(user => { ... })`:
   - If signed in: grab the ID token, assign it to `axios.defaults.headers.common.Authorization`, then call `getMe()`:
     - If the backend returns a user, commit it to `store.user` via `user/updateUser`.
     - If the backend returns nothing, call `createMe({ name, contactNumbers: ['0103801664'], photos })` — **note the hard-coded contact number** — then commit the created user.
     - On `403` the module flips `isLoggedIn = UNAUTHORIZED`; on any other error it becomes `SERVER_ERROR`.
   - It also upserts a `users/{uid}` Firestore document with `createdAt`, `firstActiveAt`, and `currentlyActive = true` — used for presence tracking.
3. Attaches a `beforeunload` listener that tries to update the same `users/{uid}` doc with `lastActiveAt` + `currentlyActive = false`.

The module also exports a module-level `fb` singleton (`{ firebase, auth, firestore }`) which views use directly to subscribe to Firestore changes.

### 4.2 Authentication flow

- `src/views/login.vue` mounts FirebaseUI into `<div id="firebaseui-auth-container" />` via `renderLoginUI(...)`.
- Sign-in providers enabled: **Email/Password** and **Google**.
- Sign-in flow: `redirect`.
- `signInSuccessUrl` falls back to `/order` (or the original `redirectedFrom` route).
- `renderLoginUI()` in `modules/firebase.ts` also accepts a merged `uiConfig` override, so callers can customise callbacks.

### 4.3 Route guard (`router/index.ts`)

Route metadata used: `bottomBar: boolean` (controls the global bottom tab bar), `loginRequired: true`, `noLoginRequired: true`.

Global `beforeEach`:

- Calls `loggedIn()` which polls the module-level `isLoggedIn` variable for up to 5 s (200 ms interval, configurable).
- If `LOGGED_IN`: any navigation to `/login`, `/unauthorized`, `/server-error` is forced back to `/order` (preserving query string).
- Else if the destination route has `meta.noLoginRequired` (e.g. `/external_order/:externalId`, `/bot`, `/login`, `/server-error`, `/unauthorized`): allow.
- Else if `SERVER_ERROR`: redirect to `/server-error`.
- Else if `UNAUTHORIZED` (Firestore whitelist fails / backend returns 403): redirect to `/unauthorized`.
- Otherwise: redirect to `/login`.

The catch-all `/:pathMatch(.*)*` falls through to `/order`.

### 4.4 Routes

| Path | Component | Meta | Description |
|------|-----------|------|-------------|
| `/order` | `views/order.vue` | `bottomBar: true`, `loginRequired: true` | Live operator order dashboard |
| `/auto_process` | `views/auto-process.vue` | `bottomBar: true` | Single-order quick-processing page (takes `?orderId=…`) |
| `/login` | `views/login.vue` | `bottomBar: false`, `noLoginRequired: true` | FirebaseUI login |
| `/account` | `views/account.vue` | `bottomBar: true` | Current user info + logout |
| `/history` | `views/history.vue` | `bottomBar: true` | Smile.one transaction history (configurable day-offset) |
| `/manage` | `views/manage.vue` | `bottomBar: true` | Admin configuration panel |
| `/server-error` | `views/server-error.vue` | `bottomBar: false`, `noLoginRequired: true` | Styled 500 page |
| `/unauthorized` | `views/unauthorized.vue` | `bottomBar: false`, `noLoginRequired: true` | Whitelist failure page w/ logout button |
| `/external_order/:externalId` | `views/external-order.vue` | `bottomBar: false`, `noLoginRequired: true` | **Public** customer order form |
| `/bot` | `views/bot.vue` | `bottomBar: false`, `noLoginRequired: true` | Iframe wrapper for FlowXO bot |
| `/:pathMatch(.*)*` | *(redirect)* | — | Redirects unknown paths to `/order` |

All routed views are **code-split** via dynamic `import(/* webpackChunkName: ... */)`.

### 4.5 App shell (`app.vue`)

- Flex-column with a fixed 65 px bottom bar that is only rendered when the current route's `meta.bottomBar` is true.
- Background color for the page turns `lightyellow` when the URL matches `/external_order` (small visual tell that you are on the public page).
- Global styles: Ionic core CSS is imported once; all other Ionic CSS utility files are commented out.

### 4.6 Bottom-bar (`components/bottom-bar.vue`)

Four tabs implemented with `<router-link custom v-slot>` and FontAwesome icons:

- Order → `/order` (`compass` icon)
- History → `/history` (`scroll` icon)
- Manage → `/manage` (`user-cog` icon)
- Account → `/account` (`user` icon)

Red/pink theme (`#ef767b` icon, `#d0252b` text, `box-shadow: 0 0 2px #d0252b`).

### 4.7 Modal (`components/modal.vue`)

- Controlled via `v-model` (`modelValue: Boolean` + `update:modelValue` emit).
- Slots: `header` (default: `<h1>Announcement</h1>`), `content`, `footer` (default: an "Ok" close button).
- Backdrop-based overlay at `position: fixed; inset: 0; background: rgba(0,0,0,.5)`.
- Fixed 500 px width, centered with transform. No mobile-responsive sizing.

### 4.8 Sidebar (`components/sidebar.vue`)

Exists but **not referenced** from any view. Safe to treat as dead code.

---

## 5. State management (Vuex)

Root store: `src/store/index.ts`. Two namespaced modules:

### 5.1 `user` module (`src/store/user.ts`)

```ts
interface UserState {
  accountType: string
  address: string
  contactNumbers: string[]
  email: string
  name: string
  permission: Record<string, any>
  photos: string[]
  status: string
  id: string
}
```

Mutations:

- `user/updateUser` — copies every own-key of the payload into state (shallow merge-ish). Committed from `modules/firebase.ts` after `getMe()` / `createMe()`.

No actions. No getters.

### 5.2 `report` module (`src/store/report.ts`)

```ts
interface ReportState {
  totalSalesCount: number
  totalIncome: number
  totalCost: number
  totalDiamond: number
  totalProfit: number
  currentPlatformCredit: number
}
```

Mutations:

- `report/update` — shallow-copy each key from the payload. Committed whenever the `statistic/mlbb` Firestore document changes (see `order.vue` and `auto-process.vue`).

No actions. No getters.

The root store file also exports a `RootStore` type and a typed `useStore()` helper that wraps Vuex's `baseUseStore()`.

---

## 6. Backend HTTP API contract (from `src/network/index.ts`)

All requests are **absolute against `VUE_APP_HTTP_BACKEND_BASEURL`** and authed via the `Authorization: <idToken>` header set by `onIdTokenChanged`. A response interceptor unwraps `response.data` so callers receive the body directly (not the Axios envelope).

| Function | Method | URL | Body / query | Frontend caller(s) |
|----------|--------|-----|--------------|--------------------|
| `createMe(param)` | POST | `/user/me` | `{ name, contactNumbers, photos }` | `modules/firebase.ts` on first login |
| `getMe()` | GET | `/user/me` | — | `modules/firebase.ts` on every auth change |
| `createOrder(param)` | POST | `/order/create` | manual-order payload (see below) | `views/manage.vue`, `views/order.vue` (fake order button) |
| `createExternalUrl(param)` | POST | `/url/create_external` | `{ userId?, responsePath?, source, game, remark?, activeDuration, maxAccessCount }` | `views/manage.vue` |
| `createExternalOrder(FormData)` | POST (`multipart/form-data`) | `/order/create_external` | FormData: `externalId, game, fullname, gameId, buyAmount, paidAmount, receiptFile?` | `views/external-order.vue` |
| `verifyExternalUrl({ id })` | POST | `/url/verify_external` | `{ id }` | `views/external-order.vue` on mount |
| `testProcessOrder()` | POST | `/test/process` | — | `views/order.vue` "Test process order" |
| `processOrder({ orderId })` | POST | `/order/process` | `{ orderId }` | `views/order.vue`, `views/auto-process.vue` |
| `archiveOrder({ orderId })` | POST | `/order/archive` | `{ orderId }` | `views/order.vue`, `views/auto-process.vue` |
| `rejectOrder({ orderId })` | POST | `/order/reject` | `{ orderId }` | `views/order.vue` |
| `archiveAllOrder()` | POST | `/order/archive_all` | — | `views/order.vue` "Archive all" |
| `updateOrder({ orderId, ... })` | POST | `/order/update` | `{ orderId, gameId?, buyAmount?, paidAmount?, remark?, processStatus? }` | `views/order.vue`, `views/auto-process.vue` edit flow |
| `test(param)` | POST | `/test` | `{}` | `views/order.vue` "Test" button |
| `getStockStatus(game)` | GET | `/stock_status?game=<game>` | — | `views/manage.vue` |
| `updateStockStatus(param)` | PUT | `/stock_status` | `{ game, remainingStock, stockAvailable, restockAt, outOfStockThreshold }` | `views/manage.vue` |
| `getPaymentAnnouncement()` | GET | `/payment_announcement` | — | `views/manage.vue`, `views/external-order.vue` |
| `setPaymentAnnouncement(param)` | PUT | `/payment_announcement` | `{ show, message }` | `views/manage.vue` |
| `getSmileOneConfig()` | GET | `/smile_one_config` | — | `views/manage.vue` |
| `setSmileOneConfig({ phpsessid })` | PUT | `/smile_one_config` | `{ phpsessid }` | `views/manage.vue` |
| `getSmileOneHistory(dayOffset)` | GET | `/smile_one_history?dayOffset=<n>` | — (default 0, UI sends negative values) | `views/history.vue` |

### 6.1 Response types known to the frontend

`getStockStatus`:
```ts
{ data: {
  game, id, remainingStock: number, stockAvailable: string,
  restockAt: number, outOfStockThreshold: number, restockAtString: string,
  outOfStock: boolean, stockMessage: string, currentDateTime: string
} }
```

`getPaymentAnnouncement`: `{ data: { show: boolean, message: string } }`

`getSmileOneConfig`: `{ data: { phpsessid: string } }`

`getSmileOneHistory`: array of records, each shaped like `{ userId: '<id> <server>', date, amount, cost, ... }` — the frontend groups them by `(id, server)` within a 2-minute window for display.

`verifyExternalUrl`: `{ status?: 'fail', data: { url, id, activeDuration, game, username, maxAccessCount, createdAt, ... } }`

`createMe` / `getMe`: returns the user row (matches `UserState`).

All endpoints that mutate Firestore data are fire-and-forget from the frontend perspective; the UI relies on the Firestore realtime listener in `views/order.vue` to reflect the result.

---

## 7. Firebase configuration

### 7.1 `firebase.json`

- **Hosting**: serves `dist/`, ignores `firebase.json`, dotfiles and `node_modules`. Single SPA rewrite `** → /index.html`.
- **Functions**: predeploy = `npm run lint && npm run build` inside `functions/`. But see §7.4 — no functions are actually defined.
- **Firestore**: rules at `firestore.rules`, indexes at `firestore.indexes.json` (empty).
- **Realtime Database**: rules at `database.rules.json` (both `.read` and `.write` set to `false` — RTDB is effectively disabled).
- **Storage**: rules at `storage.rules`.
- **Remote Config**: template at `remoteconfig.template.json` (empty).
- **Emulators**: `auth:9099`, `functions:5001`, `firestore:8080`, `database:9000`, `hosting:5000`, UI enabled.

### 7.2 Security rules

**`firestore.rules`** (`rules_version = '1'`):
```
match /{document=**} {
  allow read, write: if isLoggedIn() && isWhitelisted(request.auth.uid);
}
```
Whitelist check: `exists(/databases/$(database)/documents/allowedUser/$(uid))`. So an operator must have a document in the `allowedUser` collection keyed by their Firebase Auth UID or they get a 403 from Firestore (and from the backend — the same check is mirrored server-side, as evidenced by the `UNAUTHORIZED` path).

**`storage.rules`** (`rules_version = '2'`):
- Any logged-in user can `read`.
- Nobody can `write` from the client — all uploads happen via the backend (e.g. receipt uploads go through `POST /order/create_external` as `multipart/form-data` and the backend stores them to Storage server-side).

**`database.rules.json`**: `{ ".read": false, ".write": false }` — RTDB is locked down; not used.

### 7.3 Firestore collections known to the frontend

| Collection / doc | Fields read by FE | Who reads |
|------------------|-------------------|-----------|
| `order` (collection) | `id, fullname, ign, gameId, buyAmount, paidAmount, costPrice, priceModifier, profit, source, channel, responsePath, invoiceId, paymentStatus, game, createdAt, processAt, processStatus, receiptUrl, checkUrls[], processSuccessful[], processFailed[], errorMessage, prevOrderCount, remark, successString, failString, showReceipt` | `views/order.vue` (full collection snapshot, sorted by `createdAt` desc); `views/auto-process.vue` (single doc by `?orderId=`) |
| `statistic/mlbb` (document) | `totalSalesCount, totalIncome, totalCost, totalDiamond, totalProfit, currentPlatformCredit` | `views/order.vue`, `views/auto-process.vue` (committed into `store.report` module) |
| `users/{uid}` (document) | `createdAt, firstActiveAt, currentlyActive, lastActiveAt` | written by `modules/firebase.ts` on login / beforeunload |
| `allowedUser/{uid}` (document) | Just checked for existence (in rules) | used by Firestore rules; FE never reads it |

**`processStatus` enum values seen in code**: `open`, `processing`, `done`, `error`, `refund`, `closed`.

### 7.4 Firebase Functions (`functions/`)

- `functions/src/index.ts` — **entirely commented out**. No exports.
- `functions/lib/index.js` — stale compiled artifact from an earlier placeholder.
- Engine target: Node 12.
- Deps: `firebase-admin ^9.2.0`, `firebase-functions ^3.11.0`.

There are no deployable Cloud Functions in this repo. The backend lives entirely at `VUE_APP_HTTP_BACKEND_BASEURL` (Google App Engine: `jomini-enterprise.et.r.appspot.com`).

---

## 8. Views — detailed behaviour

### 8.1 `/order` — operator dashboard (`views/order.vue`)

Most important screen. Composition-API setup:

- `ref orders: Record<id, Order>` populated from `fb.firestore.collection('order').onSnapshot(...)`:
  - Docs sorted by `createdAt` desc before being reduced into the map.
  - Preserves `showReceipt` between snapshots (so expanding a receipt survives realtime updates, unless the order moved to `processing` in which case it is reset).
  - Derives `successString` / `failString` from `processSuccessful[]` / `processFailed[]` (each has `{ amount }`, joined by `+`).
  - `priceModifier` parsed to `float`; defaults to 0.
- When the total number of orders grows between snapshots, plays `kaching.mp3` (via a hidden `<audio ref="notificationSoundRef">` element) as a new-order chime.
- Second snapshot listener on `statistic/mlbb` commits data into Vuex `report` module (`store.report.update`).
- Header renders live stats: `salesData.totalSalesCount`, `salesData.totalProfit`, `salesData.currentPlatformCredit`.
- Ticks `currentTime` every 1 s to drive the "age of order in minutes" display.

Each order card:

- Background image keyed off `order.game` — `mlbb-bg.jpg | pubg-bg.jpg | wr-bg.png | ff-bg.jpg` from `src/assets/`.
- Shows full order fields: order ID, name (with `prevOrderCount` in green), IGN, game ID, buy amount, paid amount, cost, price modifier, profit, source, channel, FlowXO livechat link (`https://flowxo.com/app/livechat?c_am=null&c=${responsePath}`), invoice ID + **Billplz sandbox** URL (`https://www.billplz-sandbox.com/bills/{invoiceId}`) + payment status, success/fail breakdowns, remark, and the status block.
- Status block switches on `processStatus`:
  - `open` → "Ready to process" (file icon).
  - `processing` → spinner + `processAt`.
  - `error` → "Error" + `errorMessage`.
  - `done` → check icon.
  - `refund` → strike icon + timestamp.
  - `closed` → x icon + "Refund" label (intentional reuse).
- Cost / profit highlight red when ≤ 0; when `priceModifier > 1.25` it renders a struck-through "original" vs adjusted version in bold as a visual surcharge cue.
- Actions per card (in a grid column of buttons):
  - **Process** — hidden while a request is in-flight via `hideProcessIdMap`.
  - **Archive** — triggered on **double-click** (not single) as a mis-click guard; disabled while `processing`.
  - **Edit** / **Save** — toggle mode that deep-clones editable fields into `editData` and then POSTs `/order/update`.
  - **Reject** — not shown for `closed`/`refund` statuses.
- Receipt: if `receiptUrl` or `checkUrls[]` exist, a "show receipt" button toggles inline previews with a 50-second auto-collapse timer; clicking opens the original in a new tab.
- Header also has four dev-only buttons: **Test** (hits `/test`), **Test process order** (hits `/test/process`), **Create fake order** (hard-coded `createOrder({...})` payload), **Archive all** (`POST /order/archive_all`).

### 8.2 `/auto_process` — single order page (`views/auto-process.vue`)

- Reads `?orderId=<id>` from the query string.
- Subscribes to that single Firestore doc (`order/{orderId}`) via `onSnapshot`.
- On mount, if the doc exists and `processStatus === 'open'`, it **automatically calls `processOrder({ orderId })`** — used as a "one-tap link" for operators.
- Also subscribes to `statistic/mlbb` to update the same Vuex report state.
- Rendering is a single-card version of the order dashboard (mostly a copy of the order-card markup from `/order`).
- Actions: Auto Process, Archive (single-click here, no guard), Edit (Edit toggles into an editable card and PUTs via `updateOrder`).

### 8.3 `/login` (`views/login.vue`)

- Renders a centred logo (`@/assets/jomini-logo.jpeg`) plus the FirebaseUI container.
- On `signInSuccessWithAuthResult` it collapses the auth container (via a `collapse` class) and returns `true` so FirebaseUI handles the redirect.
- `signInSuccessUrl = route.redirectedFrom?.fullPath || '/order'`.

### 8.4 `/account` (`views/account.vue`)

- Reads `store.state.user` (via `useStore()`).
- Renders the user's photos (`photos[]`), name, email, id, and a **Logout** button (`logOut()` from `modules/firebase.ts` signs out and hard-navigates to `/login`).

### 8.5 `/history` (`views/history.vue`)

- Form input (number, min=2, default=3) for "last N days" of Smile.one transactions.
- Calls `getSmileOneHistory((days - 1) * -1)` — i.e. a **negative `dayOffset`**.
- Groups consecutive records with the same `(id, server)` that happened within 2 minutes of each other into row clusters; alternating grey background per group.
- `date` displayed after shifting by `+39_600_000 ms` (= +11 hours). The input change is debounced 1000 ms via `lodash/debounce`.

### 8.6 `/manage` — admin panel (`views/manage.vue`)

Five stacked sections; each section has a "updating" opacity/pointer-events lock while its request is in flight:

1. **Stock Control (MLBB only)**
   - Inputs: `stockAvailable` (checkbox), `outOfStockThreshold` (number), `restockAt` (datetime-local), `remainingStock` (disabled, read-only), computed `outOfStock`, `stockMessage`.
   - Reads via `getStockStatus(Game.MLBB)`, converts the epoch `restockAt` into `ISOString.replace('Z', '')` after adding 8 hours for GMT+8 display.
   - Writes via `updateStockStatus({ ..., restockAt: new Date(restockAt).getTime() })`.

2. **Manual order creation**
   - Fields: game (select of mlbb/pubg/wr/ff), customer name, paid amount, buy amount, game ID, remark, FlowXO response path, `enablePaymentGateway` checkbox.
   - Calls `createOrder({ userId: 0, gender: '', phone: '', email: '', receiptUrl: '', source: 'jg_internal_web', channel: 'web', ...orderData })`.

3. **External Order Creation**
   - Generates a one-time customer URL.
   - Fields: game, name (`username`), remark, `maxAccessCount` (number of submissions allowed), `activeDuration` (in **minutes** — converted to ms before sending: `* 1000 * 60`), FlowXO response path, `enablePaymentGateway`.
   - On success the response is `{ id, url }`; the UI shows both and provides **Copy** (uses `document.execCommand('copy')`) and **Open in new tab** buttons.
   - Source is hard-coded to `jg_external_url`.

4. **Payment announcement**
   - Two fields: `show` (checkbox), `message` (textarea).
   - GET on mount, PUT on "Set announcement". This message is later rendered in a modal on the public `/external_order/...` page for customers.

5. **Smile.one config credentials**
   - Single field `phpsessid` (the session cookie used by the backend to scrape/integrate with Smile.one).
   - GET on mount, PUT on "Set credentials".

### 8.7 `/external_order/:externalId` — public customer form (`views/external-order.vue`)

- Page background `lightyellow` (see `app.vue`).
- On mount: `verifyExternalUrl({ id: externalId })`.
  - If `status === 'fail'` or request throws → `pageExpired = true` ("URL expired, please get a new URL from admin / bot").
  - Else stores the result and seeds `orderData.fullname = data.username` and `orderData.game = data.game`.
- Also fetches `getPaymentAnnouncement()`; if `show: true`, the `<modal>` pops immediately with the message.
- Countdown/remaining info is computed from `createdAt + activeDuration` (ms) and from `maxAccessCount`.
- Form fields (customer-facing):
  - Game select (mlbb/pubg/wr/ff).
  - Customer name.
  - Payment screenshot (`input type="file"`, max 4 MB enforced in JS, else `alert('❌ SS bayaran tidak boleh melebihi 4MB')`).
  - Paid (RM).
  - Buy amount (labelled with a game-specific symbol: 💎 for MLBB / FF, `UC` for PUBG, `WC` for WR).
  - Game ID with game-specific placeholders (MLBB `1234567 (1234)`, PUBG `51234574345`, WR/FF `42301932`).
- Submission: builds a `FormData` containing `externalId, game, fullname, gameId, buyAmount, paidAmount` and (if provided) `receiptFile`. POSTs to `/order/create_external`.
- Success → `alert('✅ Order anda berjaya dihantar ...')`, sets `pageExpired = true` so the page self-locks.
- Failure → `alert('❌ Order anda gagal dihantar, sila pastikan semua maklumat anda adalah betul')`.
- If the customer clicks the file input but does not pick a file, a warning block appears directing them to send the screenshot via Messenger instead (`http://m.me/jominigaming`). The warning is bilingual (English + Bahasa Melayu).
- Loader: a CSS-only `lds-roller` spinner (8 rotating divs) covers the page while `orderSending` is true.

### 8.8 `/bot` — FlowXO bot embed (`views/bot.vue`)

- Full-screen fixed iframe to `https://fxo.io/m/licensed-access-6788`.
- Dark background (`#181f27`) + `loading.gif` used as a centered background while the iframe loads.

### 8.9 `/server-error` (`views/server-error.vue`)

- Decorative 500 page. Google Fonts "Monoton", blinking CSS animation. Purely visual.

### 8.10 `/unauthorized` (`views/unauthorized.vue`)

- Static page with a Medium-hosted image (`https://miro.medium.com/max/477/0*AnVCpSvrAeldg3Rn.`) + "You're not authorized!" title + **Logout** button.

---

## 9. Third-party integrations observed in the frontend

These are inferred from URLs, payload keys, and settings stored via the frontend; the actual calls to these services happen on the backend:

- **Firebase Auth** (Email/Password + Google sign-in, FirebaseUI).
- **Firebase Firestore** (realtime order feed + per-order doc + statistics doc + user presence).
- **Firebase Hosting** (`firebase deploy --only hosting` target = SPA in `dist/`).
- **Google App Engine** — the backend is hosted at `https://jomini-enterprise.et.r.appspot.com`.
- **Billplz (sandbox)** — the operator dashboard links to `https://www.billplz-sandbox.com/bills/{invoiceId}` for each invoice. The `enablePaymentGateway` toggle is passed when creating orders / external URLs.
- **FlowXO** — Messenger-based livechat/bot platform:
  - `order.responsePath` is stored and used to build `https://flowxo.com/app/livechat?c_am=null&c=${responsePath}`.
  - `/bot` embeds `https://fxo.io/m/licensed-access-6788`.
- **Smile.one** — upstream supplier for MLBB diamonds. The frontend exposes a `phpsessid` config field and a transaction-history viewer.
- **Facebook Messenger** — fallback channel for SS uploads: `http://m.me/jominigaming`.

---

## 10. Build, deploy, and local dev

- **Local dev**: `yarn serve` → webpack dev server on `http://localhost:1202`. Backend defaults to `http://localhost:8080/` (set in `.env.development.local`).
- **Production build**: `yarn build` outputs to `dist/` with `--modern` (dual-bundle modern + legacy).
- **Firebase Hosting deploy**: `firebase deploy` (or `--only hosting`) will serve `dist/` under the `jomini-enterprise` Firebase project.
- **PWA**: registered via `vue-cli-plugin-pwa` with `pwa.name = 'jomini-enterprise'`. Service worker only registers when `NODE_ENV === 'production'`.
- **Android app**: `capacitor.config.ts` references `webDir: 'dist'`, `appId: 'io.ionic.starter'` (unchanged default). The Android project exists in `android/` but is not referenced by any current workflow.
- **CI/CD**: `.github/workflows/` directory exists but is empty — no GitHub Actions pipelines.

---

## 11. Business rules encoded in the frontend

These are implicit in the current UI/code and should be preserved (or explicitly reconsidered) in the new app:

1. **Whitelist-only admin access.** Any Firebase user can sign up/in, but without a matching `allowedUser/{uid}` document they hit `/unauthorized`. Firestore rules enforce the same on reads.
2. **Price surcharge hint.** A `priceModifier > 1.25` triggers a red, bold, struck-through rendering of the "base" cost vs the adjusted cost. `priceModifier` is parsed as `float` and defaults to `0`.
3. **Negative profit / cost highlight.** Cost or profit ≤ 0 shows in red.
4. **Archive guard.** Archive is a **double-click** action on the `/order` dashboard (but a single click on `/auto_process`).
5. **Editing a done/processing order.** Clicking Edit on a `done` or `processing` order shows a `window.confirm` asking to proceed.
6. **Realtime new-order chime.** When the Firestore snapshot reports *more* orders than the previous snapshot, `kaching.mp3` plays.
7. **Order status lifecycle.** `open → processing → done | error | refund | closed`. Reject transitions `open/error → closed` (or refund). `closed` and `refund` are terminal.
8. **External URL expiry.** The public order page self-disables on (a) `verifyExternalUrl` returning `status: 'fail'`, (b) successful submission, and (c) when `createdAt + activeDuration` elapses or `maxAccessCount` is exhausted (server-side, visually surfaced by the countdown).
9. **4 MB receipt cap** client-side.
10. **+8 hour timezone offset** everywhere time-like strings are displayed (Malaysia / GMT+8). Smile.one history uses `+39_600_000 ms` (+11h) — likely reflecting a different upstream timezone that needs re-verification during the rewrite.
11. **Hard-coded defaults**: on first login the user is created with `contactNumbers: ['0103801664']`. The external-URL `source` defaults to `jg_external_url`, the manual-order `source` defaults to `jg_internal_web`.
12. **Stock management is MLBB-only** today. Other games have no stock UI.
13. **Statistics are MLBB-only** today: only `statistic/mlbb` is listened to; the header "Today sales / Today profit / Current SC" reflects MLBB alone.

---

## 12. Known smells / legacy to flag for the rewrite

- **Framework drift**: Vue CLI 5 *beta*, Vue 3 early release (`^3.0.0`), `@vue/cli-plugin-*` betas, Firebase JS SDK v8 (compat), Node 12 for Cloud Functions. All are EOL or near-EOL. The rewrite should assume Firebase SDK v9+ modular API (tree-shaken), a modern bundler (Vite), and a supported runtime.
- **Tailwind is installed but disabled** (directives commented out). If Tailwind is desired for the rewrite, re-enable and drop Bootstrap utilities.
- **Ionic + Capacitor are installed but not used at runtime** (only Ionic core CSS is imported). If mobile apps are not a product target, remove them.
- **Legacy deps**: `geofire-common`, `@googlemaps/js-api-loader`, `vue-inner-image-zoom`, `shortid` — none imported in `src/`. Remnants from the earlier "bookit" project.
- **`.env.development.local` / `.env.production.local` are committed** with real API keys. In the rewrite this should go into CI-managed secrets or `.env.example` templates.
- **`README.md` says "bookit — A facilities booking system"** — stale.
- **Duplicate order-card markup** between `/order` and `/auto_process` — should be extracted into a shared component.
- **`any` typing**: `orders`, `editData`, `orderData`, etc. are typed as `any`. The rewrite should model the `Order` / `ExternalUrl` / `StockStatus` / `SalesStatistic` domain with real interfaces.
- **Hard-coded `contactNumbers: ['0103801664']`** for every newly-created user.
- **Firestore rules version 1** on the `firestore.rules` file — should be `'2'` in the rewrite.
- **Dev-only buttons in prod UI** (`Test`, `Test process order`, `Create fake order`, `Archive all`) are unconditionally shown on `/order`.
- **Hard navigation** (`window.location.href = '/login'`) in `logOut()` — causes full reload; Vue Router push would be cleaner.
- **`document.execCommand('copy')`** is deprecated; use `navigator.clipboard.writeText`.
- **Unused `components/sidebar.vue`**.
- **Billplz URLs hard-code the sandbox domain** (`www.billplz-sandbox.com`). Production integration needs the non-sandbox URL.
- **Bottom bar is always 4 buttons** regardless of user permission; all four routes work for any whitelisted user, with no role gating in the frontend (roles exist in `UserState.permission` but nothing reads them).

---

## 13. Quick reference — feature matrix

| Feature | Route | Needs login | Whitelist | Reads Firestore | Writes Firestore (directly) | Calls backend |
|---------|-------|------------|-----------|-----------------|-----------------------------|---------------|
| Login | `/login` | no | n/a | no | no | no |
| Orders dashboard | `/order` | yes | yes | `order`, `statistic/mlbb` | no | `/order/process`, `/order/archive`, `/order/reject`, `/order/archive_all`, `/order/update`, `/order/create`, `/test`, `/test/process` |
| Single-order auto-processor | `/auto_process?orderId=` | yes | yes | `order/{id}`, `statistic/mlbb` | no | `/order/process`, `/order/archive`, `/order/update` |
| Account profile | `/account` | yes | yes | no | no | (indirect: `getMe` on app load) |
| Smile.one history | `/history` | yes | yes | no | no | `/smile_one_history` |
| Admin panel | `/manage` | yes | yes | no | no | `/stock_status`, `/order/create`, `/url/create_external`, `/payment_announcement`, `/smile_one_config` |
| Public customer order form | `/external_order/:id` | no | no | no | no | `/url/verify_external`, `/order/create_external`, `/payment_announcement` |
| Bot / landing embed | `/bot` | no | no | no | no | no |
| Server-error page | `/server-error` | no | no | no | no | no |
| Unauthorized page | `/unauthorized` | no | no | no | no | no |

---

## 14. Diagram — high-level runtime flow

```
                ┌──────────────────────┐
                │   End customer       │
                │ (Messenger / link)   │
                └──────────┬───────────┘
                           │ 1) external URL (short-lived)
                           ▼
           /external_order/:externalId  ───── verify_external ─▶ Backend ─▶ Firestore
                           │                                     (url doc)
                           │ 2) submit order (multipart)
                           ▼
              POST /order/create_external
                           │
                           ▼
              Backend creates `order/{id}` ───────────┐
                                                      │
┌──────────────────────┐                              ▼
│ Operator (whitelist) │           Firestore realtime `order` collection
│   /login             │                              │
└──────────┬───────────┘                              │
           │ Firebase Auth (email / Google)           │
           ▼                                          │
  onIdTokenChanged                                    │
   ├─ axios.defaults.headers.Authorization = idToken  │
   ├─ GET /user/me → Vuex store.user                  │
   └─ Firestore users/{uid} presence                  │
           │                                          │
           ▼                                          ▼
       /order  ◀──── Firestore onSnapshot ─────── `order/*`
           │              (kaching.mp3 on new order)
           │
           ├──▶ POST /order/process     ─┐
           ├──▶ POST /order/archive      │
           ├──▶ POST /order/reject       ├──▶ Backend mutates Firestore
           ├──▶ POST /order/update       │    (and optionally upstream vendors:
           └──▶ POST /order/archive_all ─┘     Smile.one, Billplz, FlowXO…)
```

---

*End of document — current state snapshot of the Jomini Gaming frontend as at the date of this audit.*
