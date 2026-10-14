# hermes-liang-calibrator（滑动变祖器 · Hermes 桌面端插件）

把 **Hermes 桌面端**状态栏右侧变成一台 31 档滑动变阻器：拖滑片 = 切换当前会话的
【模型 + 思考强度】，滑动时把该档背图铺满窗口（停手 5 秒淡出）；31 档名字可改、
背图可逐档换成本机图片。

- 交互与分档数学移植自 DSH 版 [`dsh-liang-calibrator`](https://github.com/TerryYu12/dsh-liang-calibrator)；
- **部署**：把 `plugin.js` 放进 `<HERMES_HOME>/desktop-plugins/liang-calibrator/plugin.js`
  （文件夹名 = 插件 id）；应用保存即热重载，Capabilities → Plugins 里可开关；
- 仓库里的 `plugin.js` 是**源码快照**（含内嵌背图）；`tools/embed-frames.mjs` 负责把
  `assets/` 的 31 帧图注入进 `FRAME_IMAGES` 块（改完代码跑一次，可选同步到部署副本）。

## 结构

- `plugin.js` — 单文件插件（磁盘插件只允许 import `@hermes/plugin-sdk` / `react` /
  `react/jsx-runtime`；UI 用 `jsx()` 调用，不是 JSX 语法；颜色只用 `var(--ui-*)`）。
  - 梯子：`model.options`（当前 provider 优先取前 6 个模型）→ 6 条状态带 × 等级均分；
  - 切换：`config.set {key:'model', value:'<model> --provider <provider>'}` +
    `config.set {key:'reasoning', value}`；贵模型 `confirm_required` 走
    `surfaceModelSwitchConfirm`（面板里另有「直切」开关可跳过）；
  - 提交时机：指针按住拖动期间**一次都不提交**，松手结算一次；键盘调节停手 150ms 兜底；
  - 背图：`.hl-wall` 挂在 `body` 首子节点、`z-index:-1`，显示期间把「输入框 → html」
    一条链上的不透明底色临时置透明（含树顶兜底扫描与中心自瞄准），5 秒后淡出并原样还原；
  - 自定义背图：内容哈希 id + IndexedDB（库 `hermes-liang-calibrator`），未引用自动回收。
- `assets/frame-00..30.webp` — 内置 31 帧（素材来源与授权见文末「素材与授权」）。
- `tools/embed-frames.mjs` — 注入帧图（幂等；`LIANG_LIVE_PLUGIN` 指定时同步部署副本）。
- `tools/probe_gateway_rpc.mjs` — 只读探针：直连桌面端本地 WS 打 gateway JSON-RPC。
- `docs/sdk-brief.md` — Hermes 桌面插件 SDK 的逐条实测简报（改代码前先查它）。

## 本机数据

- `ctx.storage`（底层 localStorage，前缀 `hermes.plugin.<id>.`）：`names`（31 个名字）、
  `images`（档位 → 图片 id）；
- 图字节在 IndexedDB；只存本机，不上传。

## 常用操作

```sh
# 改代码后：注入帧图（默认只更新仓库里的 plugin.js）
node tools/embed-frames.mjs

# 需要同步到部署处的活副本时：
LIANG_LIVE_PLUGIN="<desktop-plugins>/liang-calibrator/plugin.js" node tools/embed-frames.mjs

# 快速语法自检（磁盘插件由应用加载，无法独立运行）
cp plugin.js check.mjs && node --check check.mjs && rm check.mjs
```

验证：桌面端保存即热重载；`⌘K → Reload desktop plugins` 可手动触发；
加载失败会弹红色 toast（`Plugin "滑动变祖器" failed to load: …`）。
卸载：删掉 `desktop-plugins/liang-calibrator/` 目录或在 Plugins 页禁用。

## 只读探针（排障用）

`tools/probe_gateway_rpc.mjs <port> <token> <method> [jsonParams]` — 核对 `model.options` /
`config.get` / `session.*` 的真实数据形状。端口取桌面端日志里最后一条
「Hermes backend listening on 127.0.0.1:<port>」，token 取 `GET /` 页面里的
`__HERMES_SESSION_TOKEN__`（脚本头注释有完整步骤）。纪律：**只读**，
不要对正在使用的会话发写操作。

## 素材与授权

代码以 [MIT-0](LICENSE) 发布（不含 `assets/` 内的第三方图像素材）。

31 帧档位形象图与 [Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator)
（滑动变祖器）同源，沿用其处理方式随仓库分发；正如上游 README 所述——**素材不随 MIT 协议共享**。
本项目维护者不拥有这些图像中人物的肖像权，也不通过本项目授予任何与肖像、姓名、身份、公开权、
隐私权、商标、版权或其他第三方权利有关的许可。商业使用、再分发或制作衍生版本前，请自行确认
所在司法管辖区的适用法律、素材来源及所需授权。如你是相关权利人并希望移除素材，请提 Issue 联系。
