#!/usr/bin/env node
/**
 * 只读探针：直连 Hermes 桌面端本地 WS，打任意 gateway JSON-RPC。
 * 用途：开发桌面插件前核对真实数据形状（model.options / config.get / session.*），或排障时读状态。
 *
 * 取参数：
 *   port          <HERMES_HOME>/logs/desktop.log 里最后一条 “Hermes backend listening on 127.0.0.1:<port>”
 *   token         curl --noproxy '*' http://127.0.0.1:<port>/  →  window.__HERMES_SESSION_TOKEN__="..."
 *   sessionId（可选，runtime id）
 *                 <HERMES_HOME>/runtime/active_sessions.json → entries[].metadata.live_session_id
 *
 * 用法：
 *   node probe_gateway_rpc.mjs <port> <token> <method> ['{"k":"v"}']
 *   node probe_gateway_rpc.mjs <port> <token> model.options '{"explicit_only":true}'
 *   node probe_gateway_rpc.mjs <port> <token> config.get '{"session_id":"<runtimeId>","key":"reasoning"}'
 *
 * 纪律：只读！不要用本探针向用户正在使用的会话发写操作（config.set 等）。
 * Node >= 22（内置 WebSocket）即可，无需依赖。
 */
const [port, token, method, paramsRaw] = process.argv.slice(2)
if (!port || !token || !method) {
  console.error('usage: node probe_gateway_rpc.mjs <port> <token> <method> [jsonParams]')
  process.exit(2)
}
let params = {}
if (paramsRaw !== undefined && paramsRaw !== '') {
  try {
    params = JSON.parse(paramsRaw)
  } catch (error) {
    console.error('params 不是合法 JSON:', error.message)
    process.exit(2)
  }
}
const ws = new WebSocket(`ws://127.0.0.1:${port}/api/ws?token=${encodeURIComponent(token)}`)
let serial = 0
const rpc = (m, p) =>
  new Promise((resolve, reject) => {
    const id = String(++serial)
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler)
      reject(new Error(`timeout: ${m}`))
    }, 30000)
    const handler = (event) => {
      let message
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      if (message.id !== id) return
      clearTimeout(timer)
      ws.removeEventListener('message', handler)
      resolve(message)
    }
    ws.addEventListener('message', handler)
    ws.send(JSON.stringify({ jsonrpc: '2.0', id, method: m, params: p }))
  })
ws.addEventListener('error', (event) => console.error('WS ERROR:', event.message || String(event)))
ws.addEventListener('open', async () => {
  try {
    const reply = await rpc(method, params)
    const result = reply.result ?? reply
    console.log(JSON.stringify(result, null, 2).slice(0, 60000))
    process.exit(reply.error ? 1 : 0)
  } catch (error) {
    console.error('FAIL:', String(error))
    process.exit(1)
  }
})
setTimeout(() => {
  console.error('GLOBAL TIMEOUT')
  process.exit(2)
}, 60000)
