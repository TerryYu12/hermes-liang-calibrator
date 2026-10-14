# Hermes 桌面端插件 SDK 精确调研简报

> 目标：为「31 档滑动变阻器」磁盘插件（`plugin.js`）提供逐条可照写的接口事实。
> 所有结论均来自本地 checkout `<hermes-agent 仓库>`（下称 `$R`），
> 每条附 `文件:行号`。凡查不到的一律标「未确认」，不臆造。
> 权威文档：`$R/website/docs/developer-guide/desktop-plugin-sdk.md`（下称 `DOC`）。
> 有矛盾时以源码为准，并已注明差异。

---

## 1. 插件契约

### 1.1 默认导出形状（`HermesPlugin`）
`$R/apps/desktop/src/contrib/plugin.ts:202-211`

```ts
export interface HermesPlugin {
  id: string                 // 稳定 slug；成为贡献源的 `plugin:<id>` 与 id 命名空间
  name?: string              // 设置/关于 UI 的显示名
  description?: string       // 设置清单里的一行说明
  defaultEnabled?: boolean   // 用户尚未选择时加载即注册（默认 true；false = opt-in）
  register: (ctx: PluginContext) => void   // 加载时调用一次
}
```

`id` **必须等于目录名**（`$R/skills/autonomous-ai-agents/hermes-agent/templates/plugin.js:2-3`，DOC:20）。

### 1.2 `ctx.register` 签名与全部可注册 area
`PluginContext`：`$R/apps/desktop/src/contrib/plugin.ts:118-200`

```ts
readonly source: string                                  // ':117' —— 解析后的源标签，如 'plugin:radio'
register: (c: PluginContribution) => () => void          // ':150' 单个，返回 disposer
registerMany: (cs: PluginContribution[]) => () => void   // ':152'
registerSettingsPage: (page: PluginSettingsPage) => () => void  // ':155'（旧宿主需特性探测）
onDispose: (fn: () => void) => void                      // ':158'
onEvent: (type: string, listener: GatewayEventListener) => () => void  // ':166'（'*' = 全部）
setTimeout: (fn, ms) => () => void                       // ':170'
setInterval: (fn, ms) => () => void                      // ':171'
addEventListener: (target, type, listener, options?) => () => void  // ':174'
rest: <T>(path: string, opts?: PluginRestOptions) => Promise<T>     // ':176' → /api/plugins/<id>
socket: (path, onMessage) => () => void                  // ':180'
os: PluginOs        // ':183'（plugin.ts:72-92）
pet: PluginPet      // ':186'（plugin.ts:96-110）
runAction: (id: PluginAppActionId) => PluginRunActionResult  // ':193'
listActions: () => PluginAppActionInfo[]                 // ':195'
storage: PluginStorage   // ':197'
i18n: PluginI18n         // ':199'
```

`PluginContribution = Omit<Contribution, 'source'|'id'> & { id: string }`（`plugin.ts:46`）——
`source`/`id` 前缀由宿主自动打标（`source: 'plugin:<id>'`，id 变 `<id>:<localId>`，`plugin.ts:1-9`）。

**area 常量总表**（源码出处）：

| 导出名 | 值 / 形状 | 出处 |
|---|---|---|
| `PANES_AREA` | `'panes'` | `$R/apps/desktop/src/sdk/areas.ts:4` |
| `STATUSBAR_AREAS` | `{ left: 'statusBar.left', right: 'statusBar.right' }` | `sdk/areas.ts:5` |
| `TITLEBAR_AREAS` | `{ center:'titleBar.center', left:'titleBar.left', right:'titleBar.right' }` | `sdk/areas.ts:9` |
| `PALETTE_AREA` | 命令面板 | `sdk/index.ts:1706` |
| `ROUTES_AREA` / `SIDEBAR_NAV_AREA` / `SIDEBAR_PROFILE_GROUP_HEADER_AREA` / `WORKSPACE_PAGE_HEADER_AREA` | 路由 / 侧栏导航 / 侧栏 profile 分组头 / 页面头控件 | `sdk/index.ts:1745-1757` |
| `THEMES_AREA` | 主题 | `sdk/index.ts:2056` |
| `KEYBINDS_AREA` + `PLUGIN_APP_ACTIONS` | 键位 / 内置动作 id | `sdk/index.ts:1954` |
| `APPEARANCE_AREAS`（`.extra`） | 外观设置页末尾 | `sdk/index.ts:1760` |
| `SETTINGS_PLUGINS_AREA`（+ `pluginSettingsHref`） | 设置 ▸ 插件 | `sdk/index.ts:1895` |
| `CHAT_EMPTY_AREA` | 空白会话区 | `sdk/index.ts:1934` |
| `SESSION_ROW_AREAS`（`.leading` / `.trailing`） | 侧栏会话行装饰槽 | `sdk/index.ts:1988` |
| `SIDEBAR_NAV_PREFS_AREA` | 侧栏偏好 | `sdk/index.ts:2025` |
| `MODEL_MENU_ROW_AREA` | 模型菜单行装饰 | `sdk/index.ts:1785-1789` |
| `TRANSCRIPT_DIRECTIVE_AREA` | `::directive{}` 内联组件 | `sdk/index.ts:2001-2005` |

### 1.3 composer 系列 —— **可以**被磁盘插件直接注册，SDK **有**导出
- **是**。`COMPOSER_AREAS` 由 SDK barrel 直接导出：`sdk/index.ts:1679-1687`
  `export { COMPOSER_AREAS, type ComposerAtCompletionItem, ... } from '@/app/chat/composer/contrib'`。
- 完整值（`$R/apps/desktop/src/app/chat/composer/contrib.ts:31-40`）：

```js
export const COMPOSER_AREAS = {
  top: 'composer.top',              // 输入框上方 banner 条（render）
  bottom: 'composer.bottom',        // 输入网格下方一行（render）
  underside: 'composer.underside',  // 整个 composer 下方的悬浮条，无 chrome（render）
  leading: 'composer.leading',      // "+" 菜单之后的 inline 位（render）
  actions: 'composer.actions',      // 模型 pill 之前的 inline 位（render）
  middleware: 'composer.middleware',      // data: ComposerMiddleware
  attachments: 'composer.attachments',    // data: ComposerAttachmentProvider
  microActions: 'composer.microActions',  // data: ComposerMicroActionProvider
  atCompletions: 'composer.atCompletions',// data: ComposerAtCompletionSource
  modelPill: 'composer.modelPill'         // data: ComposerModelPillProvider
} as const
```
用法：`ctx.register({ id:'x', area: COMPOSER_AREAS.actions, render: () => jsx(MyWidget,{}) })`。
`composer.middleware` 的 `handler(draft)` 可改写/透传/`return null` 取消发送（`contrib.ts:49-52`）。

### 1.4 `defaultEnabled` 行为
`$R/apps/desktop/src/contrib/plugins-store.ts:60-65`
```ts
export function pluginActive(id: string, defaultEnabled = true): boolean {
  const decisions = $pluginDecisions.get()
  return id in decisions ? decisions[id] : defaultEnabled
}
```
「用户未选」= 键不存在 → 回落到插件自己的 `defaultEnabled`。所以 `defaultEnabled: false` 的插件
上架但默认关（radio 就是 `defaultEnabled: false`，`plugins/radio/plugin.js:693`）。
注意：磁盘「统一包半边」根会强制 `defaultEnabled:false`（`runtime-loader.ts:44-49`）。

### 1.5 热重载与失败表现（**有 toast**）
- 加载失败/注册失败**都弹错 toast**：`runtime-loader.ts:480`
  `notifyError(error, 'Plugin "<name>" failed to register')`；`:530` 与 `:745` `'Plugin "<origin>" failed to load'`。
- 模块求值 >10s 判失败：`IMPORT_TIMEOUT_MS = 10_000`（`runtime-loader.ts:66`，报 `import timed out`）。
- 热重载：每个 `plugin.js` 被 fs-watch（`watchPreviewFile`），保存即原地重载；旧实例先 dispose
  （`runtime-loader.ts:793-830`）。同 id 重载 = 卸载旧的再注册（`unloadRuntimePlugin`，`:355`）。
- 失败不会拖垮应用（错误隔离，非安全边界；见 §10）。

---

## 2. radio 插件如何注册状态栏部件

`$R/apps/desktop/src/plugins/radio/plugin.js:684-697`
```js
export default {
  id: ID, name: 'Radio', description: '...', defaultEnabled: false,
  register(ctx) {
    ctx.i18n.register(LOCALES)
    const style = document.createElement('style')      // 自己注入 CSS
    style.textContent = CSS
    document.head.append(style)
    ctx.onDispose(() => style.remove())                // 必须 onDispose 里移除
    const player = createPlayer(ctx)
    ctx.register({ id: 'player', area: STATUSBAR_AREAS.right, order: 10, render: () => jsx(RadioBar, { player, ctx }) })
  }
}
```
- `area` 字符串：用常量 `STATUSBAR_AREAS.right`（值 `'statusBar.right'`）。
- `render` 返回一个 React 元素（`jsx(...)`），组件内部用 `useValue(host.state.*)` 订阅。
- 样式类名惯例：`hermes-<plugin>-*`（`hermes-radio-bar`、`hermes-radio-panel`、`hermes-radio-row` …），
  radio 自己的 CSS 里注明「磁盘插件不被 Tailwind 扫描，只放布局，控件外观交给 Button/Popover」(`radio/plugin.js:47-48`)。
- **chip 尺寸约束**：状态栏是固定 `h-5`（20px）的 footer，槽位用 `items-stretch`，
  没有给插件的高度余量：`$R/apps/desktop/src/app/shell/statusbar-controls.tsx:104`
  `'flex h-5 shrink-0 items-stretch ...'`。核心 chip 类名常量在 `statusbar-controls.tsx:31`：
  `'inline-flex h-full items-center gap-1 rounded-none px-1.5 text-[0.6875rem] text-(--ui-text-tertiary) transition-colors hover:bg-(--chrome-action-hover) hover:text-foreground disabled:cursor-default disabled:opacity-45'`
  模板 chip 用同一套（`skills/.../templates/plugin.js` 的 `MyChip`）。结论：**chip 高度撑满 h-full，字号 0.6875rem**。

---

## 3. `host.state` 原子：精确导出名与读取方式

`host` 定义：`$R/apps/desktop/src/sdk/index.ts:670`；`state` 块 `:671-717`。
读取：`atom.get()`（一次性，**handler 里必须用这个**）或 `useValue(host.state.x)`（`= @nanostores/react useStore`，`index.ts:2083`），只在渲染该值的叶子组件里订阅（DOC:1949）。

| 导出名（`host.state.`） | 类型 | 出处 |
|---|---|---|
| `activeSessionId` | `ReadableAtom<string \| null>` 当前会话运行时 id（草稿为 null） | `index.ts:674` |
| `awaitingResponse` | `ReadableAtom<boolean>` | `:676` |
| `busy` | `ReadableAtom<boolean>` 焦点会话转中 | `:684` |
| `busyBySession` | `ReadableAtom<Record<string, boolean>>` | `:686` |
| `connectionId` | `ReadableAtom<string \| null>` 拥有活动 gateway 的注册源 | `:688` |
| `cwd` | `ReadableAtom<string>` | `:690` |
| `focusedSessionId` | `ReadableAtom<string \| null>` **焦点**会话运行时 id | `:695` |
| `focusedSessionOwner` | `ReadableAtom<PluginFocusedSessionOwner \| null>` **{connectionId, profile}** | `:698` |
| `focusedSessionProfile` | `ReadableAtom<string>` owner profile（owner 的兼容投影） | `:703` |
| `focusedStoredSessionId` | `ReadableAtom<string \| null>` 持久 id | `:706` |
| `focusedUsage` | `ReadableAtom<UsageStats \| null>` | `:712` |
| `gateway` | `ReadableAtom<string>` **socket 状态**：`'idle'\|'connecting'\|'open'\|…` | `:715` |
| `model` | `ReadableAtom<string>` 当前主模型 slug | `:717` |
| `profile` | `ReadableAtom<string>` 活动 gateway 路由到的 profile | `:718` |
| `viewport` | `ReadableAtom<ViewportRect>` `{width,height,narrow}` | `:720` |

- 当前模型：`host.state.model.get()`（注意：这是**主**模型原子，不是「焦点会话」模型；
  焦点会话模型需从 `session.info`/`$sessionStates` 读，插件无直接原子导出）。
- 焦点会话 id / stored id / profile：`focusedSessionId` / `focusedStoredSessionId` / `focusedSessionOwner`。
- gateway 连接状态：`host.state.gateway`（**WebSocket**，非 turn-busy；DOC:1083）。

---

## 4. 【最关键】模型目录：`model.options` 全链路

**RPC 方法名：`'model.options'`**（生成契约 `$R/apps/shared/src/gateway-contract.generated.ts:5232`）。

官方取数封装（**注意：以下两个函数 SDK 未导出，插件需自建同款调用**）：

- `requestModelOptions()`：`$R/apps/desktop/src/lib/model-options.ts:123-220`
- `modelOptionsQueryKey()`：`$R/apps/desktop/src/lib/model-options.ts:96-104`
  → `['model-options', profileKey|'default', sessionId|'global', ...(ownerKey ? ['owner', ownerKey] : [])]`
- 实际 dispatch：`model-options.ts:170` `await dispatch<ModelOptionsResult>('model.options', params)`

**参数结构**（`ModelOptionsParams`，`gateway-contract.generated.ts:772-778`）：
```ts
{ profile?: string | null       // 目标 profile；不传 = 环境 profile
  session_id?: string | null    // 会话目录（可能不同于 profile 全局目录）
  explicit_only?: boolean       // 聊天选择器默认 true：只列显式配置的 provider
  include_unconfigured?: boolean
  refresh?: boolean }
```
组装逻辑见 `model-options.ts:127-141`（`session_id` / `refresh` / `explicit_only` / `profile` 只在有值时带上）。
profile/网关怎么传：`requestModelOptions({ request, profile, sessionId })`，其中 `request` 是
owner 路由的调度器（tile 必须用它，避免打到环境 chrome socket，`model-options.ts:104-110,172-177`）。
插件里等价写法：
```js
host.request('model.options', { profile, session_id: host.state.focusedSessionId.get(), explicit_only: true })
```

**返回类型 `ModelOptionsResult`**（`gateway-contract.generated.ts:781-785`）：
```ts
{ providers: ModelOptionProvider[]
  model?: string      // 目录报告的当前 model
  provider?: string }
```
**`ModelOptionProvider` 完整字段**（`:787-812`）：
```ts
{ slug: string; name: string
  models?: string[]; total_models?: number|null
  is_current?: boolean|null; is_user_defined?: boolean|null
  source?: string|null; aliases?: string[]|null
  api_url?: string|null; auth_type?: string|null; authenticated?: boolean|null
  key_env?: string|null; warning?: string|null
  featured_models?: string[]|null
  capabilities?: Record<string, ModelCapabilities>|null   // ← 以 model id 为键
  pricing?: Record<string, ModelPricing>|null
  pricing_pending?: boolean|null; free_tier?: boolean|null; free_tier_pending?: boolean|null
  free_tier_row?: boolean|null; unavailable_models?: string[]|null
  limit?: ProviderLimit|null; usage?: ProviderUsage|null
  [key: string]: unknown }
```
**`ModelCapabilities`**（`:814-819`）：
```ts
{ fast: boolean; ultrafast?: boolean; reasoning: boolean; can_disable_reasoning?: boolean|null }
```

**关于「推理等级字段」**：目录里**没有** `efforts`/`reasoning_efforts` 字段，
能力面只有布尔 `reasoning` / `can_disable_reasoning`。档位阶梯来自 **@hermes/shared 的常量**
（`$R/apps/shared/src/reasoning-effort.ts:4-17`，SDK 已再导出 `sdk/index.ts:2073-2078`）：
```js
REASONING_EFFORTS       = ['minimal','low','medium','high','xhigh','max','ultra']   // 升序，none 不算一档
REASONING_EFFORT_VALUES = ['none', ...REASONING_EFFORTS]                            // 含关闭
DEFAULT_REASONING_EFFORT = 'medium'
```
另有 UI 步进阶梯（不含 max/ultra）：`REASONING_STEP_LEVELS = ['none','minimal','low','medium','high','xhigh']`
（`$R/apps/desktop/src/lib/reasoning-step.ts:9`），以及紧凑标签 `reasoningEffortLabel`
（`sdk/index.ts:1979`，Off/Min/Low/Med/High/XHigh/Max/Ultra，`lib/reasoning-effort.ts:7-16`）。
→ 31 档映射表 = 由 `model.options` 的 `providers[].models[]` × `capabilities[model].reasoning` 门控的
等级子集生成；`reasoning === false` 时只出 1 档（不切换等级或用 `none`）。

---

## 5. 【最关键】模型 + 推理等级切换的确切链路

### 5.1 agent 自己的链路（源码）
1. **控制器**：`useModelMenuController()`（`$R/apps/desktop/src/app/shell/use-model-menu-controller.ts:58`）
   订阅与菜单相同的 React Query（key = `modelOptionsQueryKey(profile, activeSessionId, ownerConnectionId)`，
   `:86-90`），暴露 `ModelSelection { model, provider, sessionId? }`（`:42-50`），把选择交给宿主的
   `onSelectModel`（`ModelMenuHostProps.onSelectModel`，`:52`）。
2. **菜单**：`ModelCatalogMenu` 渲染/导航；**它不决定语义**。命中一行调用
   `controller.select(model, provider)`（`model-catalog-menu.tsx:1173` 内部 `onSelectModel={nextModel => controller.select(nextModel, provider.slug)}`）；
   子菜单改选项调用 `controller.setOptions(...)` / `controller.applyPreset(...)`。
3. **真正的写入**：`$R/apps/desktop/src/app/session/hooks/use-model-controls.ts:339-345`
```ts
const requestSwitch = (confirmExpensiveModel = false) =>
  requestGateway<ModelSwitchResponse>('config.set', {
    session_id: liveSessionId,
    key: 'model',
    value: `${selection.model} --provider ${selection.provider}${scope}`,
    ...(confirmExpensiveModel ? { confirm_expensive_model: true } : {})
  })
```
   `scope` = `''`（主会话，允许 gateway 决定是否持久化）或 `' --session'`（**tile 会话 / moa preset 必须 session-only**），
   见 `use-model-controls.ts:327-337`。
4. **推理等级**：`$R/apps/desktop/src/lib/reasoning-step.ts:60-72`
```ts
await request('config.set', { key: 'reasoning', session_id: sessionId, value: effort })
// effort ∈ 'none'|'minimal'|...|'xhigh'|'max'|'ultra'
```
   同时设置两个维度（模型 + 等级）走 `store/model-presets.ts:170-178`：
   `config.set { key:'reasoning', session_id, value }` 与 `config.set { key:'fast', session_id, value:'fast'|'normal' }`
   并行 `Promise.all`（`model-presets.ts:141-179`）。
5. **参数/返回契约**（生成）：
   - `ConfigSetParams`（`gateway-contract.generated.ts:493-499`）：`{ profile?, key, value?, session_id?, scope?, confirm_expensive_model? }`
   - `ConfigSetResult`（`:501-514`）：`{ key, value?, warning?, confirm_required?, confirm_message?, scope?, deferred?, tool_progress?, cwd?, branch?, history_reset?, info? }`
   - **没有独立的 `model.set` / `reasoning.set` RPC**（契约里 `model.*` 只有 `model.disconnect`/`model.options`/`model.save_key`，`:5230-5234`）。
6. **`confirm_required` 二次确认**：`$R/apps/desktop/src/lib/guarded-model-switch.ts:58`
```ts
export async function surfaceModelSwitchConfirm<T extends GuardedModelSwitchResult>(
  options: SurfaceModelSwitchConfirmOptions<T>
): Promise<boolean>
```
   `GuardedModelSwitchResult = { confirm_message?, confirm_required?, deferred? }`（`:11-15`）。
   流程：`confirm()` 弹 ConfirmDialog → 用户**确认**后用 `confirm_expensive_model: true` **重发同一请求**
   （`options.requestConfirmed`）→ 若仍返回 `confirm_required` = 失败（绝不死循环）；拒绝 = 什么都没改。
   调用点示例：`use-model-controls.ts:362-386`。
7. `deferred: true`：回合进行中改模型会被排队到下一回合开始应用，**不要**立刻 re-fetch
   （`use-model-controls.ts:347-356`）。

### 5.2 SDK 导出的可复用助手（照写清单）
| 导出名 | 签名/形状 | 出处 |
|---|---|---|
| `ModelCatalogMenu` | `(props: {controller, footer?, header?, gateway?, request?, includeMoa?, ownerConnectionId?, profile?, sessionId?}) => JSX` | `model-catalog-menu.tsx:235`；SDK `sdk/index.ts:1777-1782` |
| `ModelMenuController`（type） | `{ allowSpeed?, applyPreset(preset,row), current: ModelChoice, presetFor(p,m), select(model,provider)=>Promise<boolean\|void>\|void, setOptions(patch,row) }` | `model-catalog-menu.tsx:148-170` |
| `ModelChoice`（type） | `{ effort, effortPending?, effortWire?, fast, serviceTier?, model, provider }` | `model-catalog-menu.tsx:128-139` |
| `ModelMenuCloseContext` | `createContext<() => void>` | `model-catalog-menu.tsx:77` |
| `surfaceModelSwitchConfirm` | 见 §5.1-6 | `lib/guarded-model-switch.ts:58`；SDK `sdk/index.ts:1941-1945` |
| `GuardedModelSwitchResult` / `SurfaceModelSwitchConfirmOptions`（type） | 同上 | `sdk/index.ts:1942-1945` |
| `reasoningEffortLabel` | `(effort) => string` | `sdk/index.ts:1979` |
| `REASONING_EFFORTS` / `REASONING_EFFORT_VALUES` / `DEFAULT_REASONING_EFFORT` / `ReasoningEffort` | 常量与类型 | `sdk/index.ts:2073-2078` |
| `catalogProviderMatches` | `(provider, currentProvider) => boolean` | `sdk/index.ts:1964` |

**未导出（须自己实现或用 `host.request` 直调）**：`requestModelOptions`、`modelOptionsQueryKey`、
`useModelMenuController`、`ModelSelection`、`useModelControls`/`selectModel`、`applyModelPreset`、
`setMainModelAssignment`。（已 grep 确认 `sdk/index.ts` 中无这些导出。）

### 5.3 插件用 `host.request` 调这些 RPC 有权限/scope 限制吗？
**没有。** 加载器/文档明确说明这是**错误隔离**而非安全边界：磁盘插件以完整应用权限在渲染进程
realm 中求值，`host.request` 是「gateway JSON-RPC 门」原文（`sdk/index.ts:9-17`；
`runtime-loader.ts:20-32`：「SECURITY — this is NOT a capability boundary … FULL app authority」）。
未找到 `plugin-socket-scope` / capability scope 门控的**实现**（grep `capabilityScoped`/
`plugin-socket-scope` 仅命中 `api/client.ts` 的 REST profile-scope，与插件授权无关）。
唯一 runtime 绊线是**导入白名单**（`runtime-loader.ts:338-395`）。

---

## 6. 多 profile / 连接

- **focused session 属于哪个 profile/连接**：
  `host.state.focusedSessionOwner.get()` → `PluginFocusedSessionOwner { connectionId: string, profile: string } | null`
  （类型 `sdk/index.ts:148-151`；实现 `:159-197`，歧义/未知时**fail-closed 返回 null**）。
  纯 profile 兼容投影：`host.state.focusedSessionProfile.get()`（`:703`）。
  owner 缺失时回落到 `{ connectionId: 活动连接, profile: activeGatewayProfile }`（`:166-172`）。
- **`host.request` 怎么指定目标 profile/连接**：`host.request` **不带**路由参数，永远打到**活动 socket**
  （`sdk/index.ts:1623-1632`，读 `$gateway.get()`）。要按 profile/连接路由必须用 **`host.requestProfile`**：
  ```ts
  host.requestProfile<T>(route: PluginProfileRoute | string, method: string, params = {},
                         timeoutMs?: number, options?: PluginProfileRequestOptions): Promise<T>
  ```
  （`sdk/index.ts:1514-1522`）。`PluginProfileRoute`（`:212-221`）：
  ```ts
  { connectionId: string; mode: 'local'|'remote'; primary?: true; profile: string; targetProfile: string }
  ```
  路由列表：`host.profileRoutes()`（`:1478`）；`PluginProfileRequestOptions = { spawnPriority?: 'background'|'foreground' }`
  （`:251-255`；用户显式动作传 `'foreground'`）。多 RPC 会话序列需先 `host.retainProfile(route)`（`:1545`）。
- 连接枚举/选中：`host.activeConnectionId()`（`:891`）、`host.connections()`（`:895`）、`host.agents()`（`:912`）。

---

## 7. 持久化

- `ctx.storage` 接口（`$R/apps/desktop/src/contrib/plugin.ts:49-53`）：
```ts
interface PluginStorage {
  get<T>(key: string, fallback: T): T
  set(key: string, value: unknown): void
  remove(key: string): void
}
```
- 作用域与实现（`plugin.ts:214-231`）：key 前缀 **`hermes.plugin.<id>.`**，值 JSON 序列化，
  底层 `readKey/writeKey` = **`window.localStorage`**（`$R/apps/desktop/src/lib/storage.ts:35-62`，写入 best-effort 吞异常）。
  插件间互不可见/互不覆盖。`get` 解析失败回落到 `fallback`。
- **插件文件里能否直接用 IndexedDB / localStorage**：能。磁盘插件在渲染进程 realm 中求值，
  `localStorage`/`indexedDB` 都可直接访问（`runtime-loader.ts:20-24` 明说拥有完整应用权限）。
  **但**：没有任何隔离或清理机制——禁用/热重载**不会**清理你直接写的存储（模块作用域状态与裸全局同理，
  DOC:1953-1957）。建议一律走 `ctx.storage`，需要更多就自己加 namespace 前缀 + `ctx.onDispose` 清定时器。

---

## 8. UI：可用组件、主题变量、状态栏与浮层做法

### 8.1 可用组件清单（全部由 SDK 导出，`sdk/index.ts`）
`Button`(1811) `Input`(1859) `Textarea`(1882) `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`(1877)
`Switch`(1880) `Checkbox`(1812) `SegmentedControl`(1876) `Tabs`/`TabsList`/`TabsTrigger`(1881)
`Dialog`+`DialogContent`/`Description`/`Footer`/`Header`/`Title`/`Trigger`(1835-1843)
`ConfirmDialog`(1819) `DropdownMenu`+`Content`/`Item`/`Separator`/`Trigger`(1848-1854)
`ContextMenu`+`Content`/`Item`/`CheckboxItem`/`Separator`/`Sub`/`SubContent`/`SubTrigger`/`Trigger`(1820-1832)
**`Popover`/`PopoverContent`/`PopoverTrigger`**(1865) `Tip`/`Tooltip`/`TooltipContent`/`TooltipProvider`/`TooltipTrigger`(1883)
`Badge`(1810) `Kbd`/`KbdGroup`(1860) `SearchField`(1875) `ScrollArea`(1874) `Separator`(1878) `Skeleton`(1879)
`GlyphSpinner`(1858) `Loader`(+`LoaderType`)(1863) `EmptyState`(1855) `ErrorState`(1856) `CopyButton`(1833)
`StatusDot`(+`StatusTone`)(1809) `LogView`(1864) `Codicon`(1813) `DecodeText`(1834) `SandboxedFrame`(1873)
`RowButton`(1869) `ColorSwatches`(1818) `DisclosureCaret`(1847) `FadeScroll`(1857) `ListRow`/`ToggleRow`(1765)
`Panel*` 系列(1726-1741) `SessionStatusDot`(1695) `Wordmark`(1802) `MessageTextContent`(1799) `Streamdown`(2097)
`Blobatar`/`blobatarSvg`(2090-2091) `Contribute`(1890) `WorkspacePageHeaderControl`(1712)
`CapabilitiesView`(1669) `ConnectorsTab`(1675) `ToolsetConfigPanel`(1770)
辅助：`cn`(2006) `icons`(1949，lucide 全集) `haptic`(1946) `isSubmitEnter`(1953) `createBudgetedLoop`(1931)
`LruCache`(1959) `compactNumber`(2066) `atom`/`computed`(2094) `useValue`(2083) `useQuery`/`useMutation`/`useQueryClient`/`queryClient`(2087/1975)
i18n：`useI18n`/`usePluginI18n`/`translateNow`/`LocalizedTabTitle`(1912-1926)
时间：`relativeTime`/`formatAgo`/`fmtDateTime`/`fmtDayTime`/`coarseElapsed`(1998) 颜色：`profileColor`/`profileColorSoft`/`PROFILE_SWATCHES`(1971) `contrastRatio`(2081)

### 8.2 主题变量（`$R/apps/desktop/src/styles.css`，共 185 处定义；`--ui-*` 全量）
```
--ui-base --ui-accent --ui-accent-secondary --ui-warm --ui-red --ui-orange --ui-yellow --ui-green --ui-cyan --ui-blue --ui-purple
--ui-bg-chrome --ui-bg-sidebar --ui-bg-editor --ui-bg-elevated --ui-bg-card --ui-bg-input
--ui-bg-primary --ui-bg-secondary --ui-bg-tertiary --ui-bg-quaternary --ui-bg-quinary
--ui-row-hover-background --ui-row-active-background --ui-row-open-background
--ui-control-hover-background --ui-control-active-background
--ui-text-primary --ui-text-secondary --ui-text-tertiary --ui-text-quaternary
--ui-stroke-primary --ui-stroke-secondary --ui-stroke-tertiary --ui-stroke-quaternary
--ui-sash-hover-border --ui-sash-hover-background
--ui-surface-background --ui-sidebar-surface-background --ui-chat-surface-background
--ui-editor-surface-background --ui-terminal-surface-background --ui-widget-surface-background
--ui-chat-bubble-background --ui-chat-bubble-opaque-background
--ui-inline-code-background --ui-inline-code-foreground --ui-selection-background
--ui-diff-add-border/-background/-foreground --ui-diff-remove-border/-background/-foreground
--ui-tab-hover-darken
```
（定义集中 `styles.css:239-419` + 深色覆盖 `:612-635`。）另有 `--chrome-action-hover`（`styles.css`，
模板 chip hover 用）与一层 `--theme-*` 原始 token（`--theme-foreground`/`--theme-midground`/`--theme-primary`/
`--theme-warm`/`--theme-neutral-*`/`--theme-mix-*` …）。Tailwind 用法：`text-(--ui-text-tertiary)`、`bg-(--ui-sidebar-surface-background)`。
**禁止硬编码颜色**（DOC:1943-1945）。

### 8.3 状态栏部件与弹层的正确做法（radio 实证）
**用 SDK 的 `Popover`，不是 portal 手写**。radio 的真源码（`$R/apps/desktop/src/plugins/radio/plugin.js:663-679`）：
```js
return jsxs('div', { className: 'hermes-radio-bar', 'data-tour':'radio-player', 'data-radio-status': status, children: [
  jsx(Waveform, { player, compact: true }),
  jsxs(Popover, { open, onOpenChange, children: [
    jsx(PopoverTrigger, { asChild: true, children: jsx(Button, {
      ref: triggerRef, variant: 'ghost', size: 'micro',
      style: { width: open ? browseWidth : undefined },
      'aria-label': `${t('browse')}: ${station.name}`,
      children: jsx('span', { className: 'radio-name', children: station.name })
    }) }),
    jsx(PopoverContent, { side: 'top', align: 'end', className: 'hermes-radio-panel',
      'aria-label': t('radio'), 'data-tour': 'radio-panel', children: jsxs('div', { children: [...] }) })
  ] }),
  ...
] })
```
`open` 状态存在插件自己的 `atom`（`player.open`，`:665` 用 `useValue` 订阅），Trigger 宽度用
`getBoundingClientRect()` 冻结。radio 另有一处 `document.body.append(element)` 但那是**隐藏 `<audio>`**
（`:205-221`），不是 UI。

### 8.4 往 `document.body` 注入 fixed 全屏覆盖层（背景图）可行吗？
**技术上可行**（渲染进程完整权限），但**官方口径明确不鼓励**，并给了替代门：
- DOC:563 把 pet-wallet 旧做法（`document.querySelector('canvas[aria-label$=" pet"]')` +
  「`position:fixed; z-index:9999` overlay on `document.body`」）列为**反例**，替代是 `ctx.pet.say(...)`。
- DOC:563 那一条也说明：**明文的「禁止/限制条款」只针对 pet 画布与原生快捷键合成**，
  并没有一条文档条款禁止「在 document.body 注入你自己的 fixed 覆盖层」。
- 但必须遵守 §10 的全局资源纪律：注入的 `<style>`/`addEventListener` 宿主看不见，
  **必须挂 `ctx.onDispose`**（radio 就是这么做的：`plugin.js:688-690`）。
- 先例（合法的 body 级注入）：radio 追加隐藏 `<audio>` 到 body（`plugin.js:221`）；
  radio/kanban 自行 `document.head.append(<style>)` + `ctx.onDispose(remove)`。
- 结论：全屏档位背景图覆盖层**可行、有先例套路**（自建 fixed 元素 + onDispose 清理 + 只用 `var(--ui-*)`），
  但没有专门的 SDK 门，也**没有**「禁止」条款；「pet 画布不要动」是明确限制（见 §10）。

---

## 9. 加载与程序化验证

### 9.1 加载机制
- **哪个进程读目录**：Electron 主进程解析根目录（`window.hermesDesktop.desktopPluginsRoot()`，
  IPC `hermes:fs:desktopPluginsRoot`，`$R/apps/desktop/electron/fs-ipc.ts:121-129`），
  **渲染进程的 runtime loader** 扫描并求值：`watchRuntimePlugins()`
  （`$R/apps/desktop/src/contrib/runtime-loader.ts:1025`），由 `discoverBundledPlugins()` 收尾调用
  （`contrib/plugins.ts:84`，仅一次，`plugins.ts:30-38`）。
- **多久生效**：每个 `plugin.js` 被 fs-watch，**保存即热重载**（`:793-830`）；根目录被 `watchDirectory`
  fs-watch，**新文件夹立即装载 / 删除立即卸载**（`:1025-1043`）。旧 Electron 无 `watchDirectory` 时
  退化为**可见标签页每 5s 轮询**：`DISK_POLL_MS = 5_000`（`:565`，`:1108-1119`）。
  手动触发：⌘K → **Reload desktop plugins**（palette id `plugins.reload`，
  `$R/apps/desktop/src/app/contrib/controller.tsx:329-338`）。
- **根目录（源码为准）**：**APP 级**、**非** profile 级 —— `<HERMES_HOME>/desktop-plugins/<id>/plugin.js`
  （`electron/desktop-plugins-root.ts:1-4`；`fs-ipc.ts:118-127` 注释：「APP-level, never profile-scoped … Earlier builds scoped it per profile」）。
  ⚠️ **与模板/文档的差异**：`skills/.../templates/plugin.js:3-6` 写「`~/.hermes` 或 `~/.hermes/profiles/<name>`」，
  那是**旧行为**；源码 `migrateProfileScopedDesktopPlugins()`（`desktop-plugins-root.ts:126`）会把 profile 级残留
  一次性上移到 app 根。**照写时用 app 级根**。
- **插件清单/启用状态持久化在哪**：
  - 启用决策：**渲染进程 `localStorage`**，key **`hermes.desktop.pluginDecisions.v2`**
    （值 `{ [id]: boolean }`；旧 key `hermes.desktop.disabledPlugins.v1` 会被迁移）
    （`$R/apps/desktop/src/contrib/plugins-store.ts:37-56`）。
  - 清单记录：内存 atom `$pluginRecords`（`plugins-store.ts:71`），**不落盘**——重启后由各加载器重新发布。
  - 设置 UI：**Capabilities ▸ Plugins** 页（`app/capabilities/plugins/plugins-tab.tsx`，开关走
    `setPluginEnabled(id, enabled)`，`plugins-store.ts:110-127`；也可从该页 reveal 插件文件夹，走同一 IPC）。

### 9.2 不靠肉眼看 UI 就验证「插件已被加载/启用」
1. **日志**（首选）：`hermes logs gui -f`（DOC:1990 的 Troubleshooting 明确指向它；`fs-ipc.ts:150-155`
   把本地 logs 根暴露为 `<HERMES_HOME>/logs`，profile-aware）。加载/注册失败会打
   `console.error('[plugins] <id> failed to register', error)` 并发 `notifyError` 错 toast。
2. **状态文件/存储**：读 `localStorage['hermes.desktop.pluginDecisions.v2']`（Electron 用户数据目录的
   Local Storage leveldb）确认 enabled/disabled 决策；但**「已加载」不在磁盘上**（`$pluginRecords` 仅内存）。
3. **进程/开发工具**：CDP 连渲染进程，检查 `window.__HERMES_PLUGIN_SDK__`（`sdk/runtime.ts:22-26`
   `installPluginSdk()` 成功后存在）与 `$pluginRecords` 对应行（`status:'loaded'|'error'|'disabled'`）。
4. **后端侧无关**：桌面插件不经 Python 插件系统；`ctx.rest` 才需要 `plugin_api.py`（DOC:1994-1998）。

---

## 10. 限制与坑清单

1. **只能 import 三个 specifier**：`@hermes/plugin-sdk`、`react`、`react/jsx-runtime`
   （允许表 `sdk/runtime.ts:48-55` 实际是 4 个：含 `react/jsx-dev-runtime`；DOC:1940 / `runtime-loader.ts:394`
   表述为「只能 @hermes/plugin-sdk 和 react*」）。任何其它 import（含 `https:` URL、相对路径、裸包名）
   → **加载即报 `unsupported import: …`** 并拒绝（`runtime-loader.ts:338-395`）。
2. **磁盘插件里 JSX 不能解析**：文件未编译加载，必须用 `jsx()` / `jsxs()`（来自 `react/jsx-runtime`）
   或 `React.createElement`（DOC:1935-1937；模板/radio 均如此）。
3. **不要硬编码颜色**：一律 `var(--ui-*)`（DOC:1943-1945；`plugin.js` 只写布局）。
4. **handler 里必须 `.get()` 读状态**，不要从渲染闭包读——快速事件会拿到旧值；只在叶子组件里
   `useValue` 订阅（DOC:1949-1950）。
5. **裸全局不被追踪**：`window.setInterval` / `window.addEventListener` / 自己 append 的 `<style>`
   宿主看不见，禁用/热重载后仍存活（ESM 无法卸载，热编辑会叠加副本）。
   必须用 `ctx.setTimeout` / `ctx.setInterval` / `ctx.addEventListener`，其余挂 `ctx.onDispose`
   （DOC:1953-1957；radio 的 style 就是这么清的）。
6. **模块求值 10s 死线**：顶层 `await` 不结束 = 加载失败 `import timed out`；等待逻辑放进 `register()`
   （`runtime-loader.ts:66`；DOC:1959-1961）。
7. **不要动 pet 画布**：不要 `canvas[aria-label$=" pet"]` / 自己跟帧画浮层，用 `ctx.pet.say/clear/visible`
   （DOC:563, 1256-1316）。指针交互（拖拽、shift-click 弹出）归核心。
8. **不要合成快捷键 KeyboardEvent** 去触发应用自己的动作，用 `ctx.runAction(id)`
   （DOC:564；`plugin.ts:186-195`）。
9. **一个 id 一个文件**：两个文件夹同 `id` 按文件夹名先到先得，后者在 Plugins 页标 `duplicate id`
   （DOC:1965-1967）。
10. **`ctx.socket` 在 OAuth 远程上是 no-op**，必须有轮询兜底（DOC:1969）。
11. **不要比几秒更快地 poll `host.request`**，优先 `host.onEvent` / `ctx.socket` + React Query 去重（DOC:1952）。
12. **Canvas pane 必须用 `ResizeObserver`** 跟踪容器并改 width/height 属性，而非只改 CSS（DOC:1951-1952）。
13. **引用了就必须 import**：`jsx()` 里出现的标识符没 import = 渲染时 `ReferenceError`（DOC:1947-1948, 2002）。
14. 插件标题等注册时读取的字符串要用 `translateNow`（`sdk/index.ts:1903-1911` 注释）。
15. **安全边界说明**：导入白名单不是沙箱；磁盘插件=完整应用权限（`runtime-loader.ts:20-32`）。

---

## 附：对本插件（31 档滑动变阻器）的落地映射

- 状态栏 chip：`ctx.register({ id:'chip', area: STATUSBAR_AREAS.right, order:<n>, render: () => jsx(Capsule,{}) })`
  （chip 类名照 `statusbar-controls.tsx:31` 的常量；高 `h-full`，字号 `0.6875rem`）。
- 档位表：`host.requestProfile(route, 'model.options', { profile, session_id, explicit_only:true })`
  → 遍历 `providers[].models[]`，用 `capabilities[model].reasoning` 门控等级子集
  （等级阶梯 `REASONING_EFFORTS` / `REASONING_EFFORT_VALUES`；标签 `reasoningEffortLabel`）。
- 拖杆落地写：先 `config.set {session_id, key:'model', value:`<model> --provider <provider>`+(tile? ' --session':'')}`，
  再 `config.set {session_id, key:'reasoning', value:<effort>}`；捕获 `confirm_required` 时走
  `surfaceModelSwitchConfirm(...)`（`requestConfirmed` 重发带 `confirm_expensive_model:true`）。
  注意 `deferred:true` 时不要立刻 refresh（等 `session.info`）。
- 全屏档位背景图：自建 fixed 覆盖层 + `document.head.append(<style>)`/`addEventListener` 全部挂 `ctx.onDispose`。
- 目标 profile/连接：`host.state.focusedSessionOwner.get()`（null 时 fail-closed，不要瞎猜）；
  非活动连接的 RPC 走 `host.requestProfile(route, …)`，多 RPC 序列先 `host.retainProfile(route)`。

### 未确认项
- 「31 档」的具体档位→(模型, 等级) 组合规则：**未确认**，仓库内无现成映射表，需按 §4 的
  `providers[].models[] × capabilities[].reasoning` 现场生成。
- 插件是否有「per-plugin capability grant / scope」在途实现：**未确认**，当前源码只有 import 白名单，
  `sdk/index.ts:16-17` 注释称 `host.request` 是「per-plugin capability grants」的**未来**接缝。
- 桌面插件「已加载」的纯磁盘可读状态文件：**未确认**（`$pluginRecords` 仅内存 + localStorage 只存启用决策）。
