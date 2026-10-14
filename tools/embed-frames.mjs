/**
 * 把 assets/frame-00..30.webp 注入 plugin.js 的 FRAME_IMAGES 块（幂等，素材更新后重跑）。
 *
 * 用法：
 *   node tools/embed-frames.mjs                       # 只更新本仓库的 plugin.js
 *   LIANG_LIVE_PLUGIN=<部署副本路径> node tools/embed-frames.mjs
 *                                                     # 同时写部署处的活副本
 *   （未设 LIANG_LIVE_PLUGIN 时，若环境里有 HERMES_HOME，默认写
 *    $HERMES_HOME/desktop-plugins/liang-calibrator/plugin.js）
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT = fileURLToPath(new URL('..', import.meta.url))
const LIVE = process.env.LIANG_LIVE_PLUGIN
  ?? (process.env.HERMES_HOME
    ? join(process.env.HERMES_HOME, 'desktop-plugins', 'liang-calibrator', 'plugin.js')
    : null)
const SNAPSHOT = join(PROJECT, 'plugin.js')
const BEGIN = '/* ==FRAME-IMAGES-BEGIN== */'
const END = '/* ==FRAME-IMAGES-END== */'

const frames = []
for (let index = 0; index < 31; index += 1) {
  const name = String(index).padStart(2, '0')
  const bytes = await readFile(join(PROJECT, 'assets', `frame-${name}.webp`))
  frames.push(`data:image/webp;base64,${bytes.toString('base64')}`)
}

const block = [
  BEGIN,
  '/** 内置 31 张档位背图（webp data URL；由 tools/embed-frames.mjs 注入，勿手改）。 */',
  'const FRAME_IMAGES = [',
  ...frames.map((url) => `  '${url}',`),
  ']',
  END,
].join('\n')

// 有部署副本时以它为基准（真身在部署处被手改/热更），否则以仓库快照为基准。
const basePath = LIVE !== null ? LIVE : SNAPSHOT
const source = await readFile(basePath, 'utf8')
const start = source.indexOf(BEGIN)
const end = source.indexOf(END)
if (start < 0 || end < 0) throw new Error(`FRAME-IMAGES markers not found in ${basePath}`)
const next = source.slice(0, start) + block + source.slice(end + END.length)
await writeFile(SNAPSHOT, next)
if (LIVE !== null && LIVE !== SNAPSHOT) await writeFile(LIVE, next)
console.log(`embedded ${frames.length} frames → ${(next.length / 1024 / 1024).toFixed(2)} MB`)
console.log(`  snapshot: ${SNAPSHOT}`)
console.log(`  live:     ${LIVE ?? '（未设置 LIANG_LIVE_PLUGIN / HERMES_HOME，跳过）'}`)
