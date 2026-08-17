/**
 * 昔涟 (Cyrene) plugin — Host half.
 *
 * Combined host for the cyrene skin + pet plugin. Listens to DSH session
 * events and projects them onto a pet activity state machine. Serves the
 * current state, settings, and pet assets (Live2D model + Cubism Core)
 * through /api/cyrene/* JSON endpoints.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'

/** Map activity phase to animation. */
function animationForPhase(phase) {
  switch (phase) {
    case 'thinking': return 'running'
    case 'tool': return 'running-right'
    case 'review': return 'review'
    case 'waiting': return 'waiting'
    case 'done': return 'jumping'
    case 'failed': return 'failed'
    case 'idle': return 'idle'
    default: return 'idle'
  }
}

export var name = 'cyrene'
export var inject = ['webServer']

/** Per-session projection runtime. */
function createProjectionRuntime() {
  return { activeTools: new Set(), seenOfficial: false, stepHadFailure: false }
}

/** Project one session event to a pet activity transition. */
function projectEvent(event, runtime) {
  switch (event.type) {
    case 'turn/start':
      runtime.activeTools.clear(); runtime.stepHadFailure = false
      return { phase: 'waiting', line: '准备开始', phrase: '让我想想…' }
    case 'step/start':
      runtime.activeTools.clear(); runtime.stepHadFailure = false
      return { phase: 'waiting', line: '等待模型', phrase: '正在思考…' }
    case 'assistant/chunk': {
      var chunk = event.data.chunk
      if (chunk.type === 'reasoning-delta' && chunk.text.length > 0)
        return { phase: 'thinking', line: '深度思考中', phrase: '嗯…让我想想' }
      if (chunk.type === 'text-delta' && chunk.text.length > 0)
        return { phase: 'review', line: '整理回复', phrase: '正在整理回答' }
      return undefined
    }
    case 'assistant/message':
      return { phase: 'review', line: '整理回复', phrase: '回答整理中' }
    case 'tool/call':
      runtime.activeTools.add(event.data.callId)
      return { phase: 'tool', line: '使用工具: ' + event.data.name.slice(0, 24), phrase: '正在操作…' }
    case 'tool/result': {
      runtime.activeTools.delete(event.data.message.source.callId)
      runtime.stepHadFailure ||= event.data.error !== undefined
      if (runtime.activeTools.size > 0)
        return { phase: 'tool', line: '还有 ' + runtime.activeTools.size + ' 个工具运行中', phrase: '马上就好！' }
      return runtime.stepHadFailure
        ? { phase: 'failed', line: '工具执行失败', phrase: '出了点小问题…' }
        : { phase: 'thinking', line: '处理工具结果', phrase: '分析结果中' }
    }
    case 'turn/end': {
      runtime.activeTools.clear()
      switch (event.data.reason.kind) {
        case 'completed': return { phase: 'done', line: '完成啦！', phrase: '搞定！' }
        case 'error': return { phase: 'failed', line: '执行失败', phrase: '出错了…' }
        case 'aborted': return { phase: 'idle', line: undefined, phrase: undefined }
        case 'blocked': return { phase: 'waiting', line: '等待继续', phrase: '等你指示' }
        default: return { phase: 'idle', line: undefined, phrase: undefined }
      }
    }
    default: return undefined
  }
}

var __dirname = dirname(fileURLToPath(import.meta.url))
var PACKAGE_ROOT = join(__dirname, '..')
var ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'cyrene')

// Custom font storage: $DSH_HOME/cyrene-fonts/
var FONTS_DIR = join(process.env.DSH_HOME || homedir(), '.dsh', 'cyrene-fonts')

var MIME_BY_EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.js': 'application/javascript',
  '.moc3': 'application/octet-stream', '.model3.json': 'application/json',
  '.physics3.json': 'application/json', '.motion3.json': 'application/json',
  '.exp3.json': 'application/json',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

function mimeFor(file) {
  var dot = file.lastIndexOf('.')
  if (dot < 0) return 'application/octet-stream'
  return MIME_BY_EXT[file.slice(dot).toLowerCase()] || 'application/octet-stream'
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = []
    req.on('data', function (c) { chunks.push(c) })
    req.on('end', function () {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

export function apply(ctx) {
  var sessions = new Map()
  var currentPhase = { phase: 'idle', line: undefined, phrase: undefined, sessionActive: false }
  var celebrationTimeout = 2400
  var doneAt = null

  ctx.on('turn/start', function (data) {
    var runtime = createProjectionRuntime()
    sessions.set(data.turn, runtime)
    var t = projectEvent({ type: 'turn/start', data: data }, runtime)
    if (t) { currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true } }
  })
  ctx.on('step/start', function (data) {
    var key = data.turn + ':' + data.step
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    sessions.set(key, runtime)
    var t = projectEvent({ type: 'step/start', data: data }, runtime)
    if (t) { currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true } }
  })
  ctx.on('assistant/chunk', function (data) {
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    var t = projectEvent({ type: 'assistant/chunk', data: data }, runtime)
    if (t) { currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true } }
  })
  ctx.on('assistant/message', function (data) {
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    var t = projectEvent({ type: 'assistant/message', data: data }, runtime)
    if (t) { currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true } }
  })
  ctx.on('tool/call', function (data) {
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    var t = projectEvent({ type: 'tool/call', data: data }, runtime)
    if (t) { currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true } }
  })
  ctx.on('tool/result', function (data) {
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    var t = projectEvent({ type: 'tool/result', data: data }, runtime)
    if (t) {
      currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true }
      if (t.phase === 'done') { doneAt = Date.now() }
    }
  })
  ctx.on('turn/end', function (data) {
    var runtime = sessions.get(data.turn) || createProjectionRuntime()
    var t = projectEvent({ type: 'turn/end', data: data }, runtime)
    if (t) {
      currentPhase = { phase: t.phase, line: t.line, phrase: t.phrase, sessionActive: true }
      if (t.phase === 'done') { doneAt = Date.now() }
    }
    sessions.delete(data.turn)
  })

  function buildState() {
    var now = Date.now()
    var phase = currentPhase.phase
    var animation = animationForPhase(phase)
    if (phase === 'done' && doneAt !== null) {
      if (now - doneAt < celebrationTimeout) { animation = 'jumping' }
      else { animation = 'idle'; phase = 'idle'; currentPhase.phase = 'idle' }
    }
    var settled = phase === 'idle' || (phase === 'done' && doneAt !== null && now - doneAt >= celebrationTimeout)
    return {
      phase: phase, animation: animation,
      line: settled ? undefined : currentPhase.line,
      phrase: settled ? undefined : currentPhase.phrase,
      sessionActive: currentPhase.sessionActive, timestamp: now,
    }
  }

  // ── HTTP API ──
  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/state',
    handler: function (req, res) { json(res, 200, buildState()) },
  })
  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/info',
    handler: function (req, res) {
      json(res, 200, {
        name: '昔涟', description: '昔涟主题 + 桌宠',
        assets: ['cyrene-avatar.png', 'model/Cyrene.model3.json'],
      })
    },
  })

  var petPosition = { right: 24, bottom: 20, zoom: 1 }
  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/config',
    handler: function (req, res) { json(res, 200, petPosition) },
  })
  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/set-config',
    handler: function (req, res) {
      readBody(req).then(function (body) {
        if (typeof body.right === 'number') petPosition.right = Math.max(0, Math.round(body.right))
        if (typeof body.bottom === 'number') petPosition.bottom = Math.max(0, Math.round(body.bottom))
        if (typeof body.zoom === 'number') petPosition.zoom = Math.max(0.5, Math.min(2, Math.round(body.zoom * 10) / 10))
        json(res, 200, { ok: true, config: petPosition })
      }).catch(function (e) { json(res, 400, { ok: false, error: String(e) }) })
    },
  })

  var pluginSettings = { particles: true, gradient: true, idleAnim: true, phaseMotions: true, petVisible: true }
  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/settings',
    handler: function (req, res) {
      if (req.method === 'GET') { json(res, 200, pluginSettings); return }
      if (req.method === 'POST') {
        readBody(req).then(function (body) {
          for (var k of ['particles', 'gradient', 'idleAnim', 'phaseMotions', 'petVisible']) {
            if (typeof body[k] === 'boolean') pluginSettings[k] = body[k]
          }
          json(res, 200, { ok: true, settings: pluginSettings })
        }).catch(function (e) { json(res, 400, { ok: false, error: String(e) }) })
        return
      }
      json(res, 405, { ok: false, error: 'method not allowed' })
    },
  })

  ctx.webServer.register({
    kind: 'prefix', path: '/cyrene',
    handler: function (req, res) {
      try {
        var url = new URL(req.url, 'http://local')
        var segments = url.pathname.split('/').filter(Boolean)
        if (segments.length < 2 || segments[0] !== 'cyrene') { res.writeHead(404); res.end(); return }
        var filename = decodeURIComponent(segments.slice(1).join('/'))
        // Try assets dir first, then fonts dir
        var filePath = join(ASSETS_DIR, filename)
        if (!filePath.startsWith(ASSETS_DIR) && !filePath.startsWith(FONTS_DIR)) { res.writeHead(403); res.end(); return }
        if (!existsSync(filePath)) {
          filePath = join(FONTS_DIR, filename)
          if (!filePath.startsWith(FONTS_DIR) || !existsSync(filePath)) { res.writeHead(404); res.end(); return }
        }
        readFile(filePath).then(function (body) {
          res.writeHead(200, {
            'content-type': mimeFor(filePath), 'content-length': String(body.byteLength),
            'cache-control': 'no-cache',
          })
          res.end(body)
        }, function () { res.writeHead(404); res.end() })
      } catch (e) { res.writeHead(500); res.end(String(e)) }
    },
  })

  // ── Custom Font API ──
  var currentFont = null // { fileName, displayName } or null

  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/font',
    handler: function (req, res) {
      if (req.method === 'GET') {
        json(res, 200, currentFont || { kind: 'default', displayName: '系统默认' })
        return
      }
      if (req.method === 'POST') {
        readBody(req).then(function (body) {
          var name = body.name
          var data = body.data // base64-encoded font file
          if (typeof name !== 'string' || !name.match(/^[a-zA-Z0-9][a-zA-Z0-9._\s-]+\.(ttf|otf)$/i)) {
            json(res, 400, { ok: false, error: '无效的文件名' })
            return
          }
          if (typeof data !== 'string' || data.length > 50 * 1024 * 1024) {
            json(res, 400, { ok: false, error: '无效的文件数据' })
            return
          }
          var ext = extname(name).toLowerCase()
          var fileName = 'custom-' + randomUUID() + ext
          mkdir(FONTS_DIR, { recursive: true }).then(function () {
            return writeFile(join(FONTS_DIR, fileName), Buffer.from(data, 'base64'))
          }).then(function () {
            currentFont = { fileName: fileName, displayName: body.displayName || name }
            json(res, 200, { ok: true, font: currentFont })
          }).catch(function (e) { json(res, 500, { ok: false, error: String(e) }) })
        }).catch(function (e) { json(res, 400, { ok: false, error: String(e) }) })
        return
      }
      json(res, 405, { ok: false, error: 'method not allowed' })
    },
  })

  ctx.webServer.register({
    kind: 'exact', path: '/api/cyrene/font/reset',
    handler: function (req, res) {
      if (req.method !== 'POST') { json(res, 405, { ok: false, error: 'method not allowed' }); return }
      if (currentFont) {
        var oldPath = join(FONTS_DIR, currentFont.fileName)
        rm(oldPath, { force: true }).catch(function () {})
      }
      currentFont = null
      json(res, 200, { ok: true })
    },
  })
}
