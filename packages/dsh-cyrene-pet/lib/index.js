/**
 * 昔涟 (Cyrene) pet companion — Host half.
 *
 * Listens to DSH session events (turn/start, turn/end, step/start, step/end,
 * tool/call, tool/result, assistant/chunk, assistant/message) and projects
 * them onto a pet activity state machine. Serves the current state + registry
 * through /api/cyrene-pet/* JSON endpoints and pet assets from
 * /cyrene-pet/<path>.
 *
 * Pattern: proven dsh-pet (@linxin666/dsh-pet) event-projection + state
 * machine, adapted for Cyrene's Live2D model (rendered in the browser half).
 * The browser half renders the actual model; this host half only provides
 * the state machine and HTTP API.
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

/** The pet activity phase vocabulary. */
var ACTIVITY_PHASES = ['idle', 'waiting', 'thinking', 'tool', 'review', 'done', 'failed']

/** 9-state animation contract (spritesheet rows). */
var PET_ANIMATIONS = [
  'idle', 'running-right', 'running-left', 'waving',
  'jumping', 'failed', 'waiting', 'running', 'review',
]

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

/** Plugin entry: register session event listeners and HTTP routes. */
export var name = 'cyrene-pet'
export var inject = ['webServer']

/** Per-session projection runtime. */
function createProjectionRuntime() {
  return { activeTools: new Set(), seenOfficial: false, stepHadFailure: false }
}

/** Project one session event to a pet activity transition. */
function projectEvent(event, runtime) {
  switch (event.type) {
    case 'turn/start':
      runtime.activeTools.clear()
      runtime.stepHadFailure = false
      return { phase: 'waiting', line: '准备开始', phrase: '让我想想…' }
    case 'step/start':
      runtime.activeTools.clear()
      runtime.stepHadFailure = false
      return { phase: 'waiting', line: '等待模型', phrase: '正在思考…' }
    case 'assistant/chunk': {
      var chunk = event.data.chunk
      if (chunk.type === 'reasoning-delta' && chunk.text.length > 0) {
        return { phase: 'thinking', line: '深度思考中', phrase: '嗯…让我想想' }
      }
      if (chunk.type === 'text-delta' && chunk.text.length > 0) {
        return { phase: 'review', line: '整理回复', phrase: '正在整理回答' }
      }
      return undefined
    }
    case 'assistant/message':
      return { phase: 'review', line: '整理回复', phrase: '回答整理中' }
    case 'tool/call':
      runtime.activeTools.add(event.data.callId)
      return {
        phase: 'tool',
        line: '使用工具: ' + event.data.name.slice(0, 24),
        phrase: '正在操作…',
      }
    case 'tool/result': {
      runtime.activeTools.delete(event.data.message.source.callId)
      runtime.stepHadFailure ||= event.data.error !== undefined
      if (runtime.activeTools.size > 0) {
        return {
          phase: 'tool',
          line: '还有 ' + runtime.activeTools.size + ' 个工具运行中',
          phrase: '马上就好！',
        }
      }
      return runtime.stepHadFailure
        ? { phase: 'failed', line: '工具执行失败', phrase: '出了点小问题…' }
        : { phase: 'thinking', line: '处理工具结果', phrase: '分析结果中' }
    }
    case 'turn/end': {
      runtime.activeTools.clear()
      switch (event.data.reason.kind) {
        case 'completed':
          return { phase: 'done', line: '完成啦！', phrase: '搞定！' }
        case 'error':
          return { phase: 'failed', line: '执行失败', phrase: '出错了…' }
        case 'aborted':
          return { phase: 'idle', line: undefined, phrase: undefined }
        case 'blocked':
          return { phase: 'waiting', line: '等待继续', phrase: '等你指示' }
        default:
          return { phase: 'idle', line: undefined, phrase: undefined }
      }
    }
    default:
      return undefined
  }
}

/** Per-package dir for asset resolution. */
var __dirname = dirname(fileURLToPath(import.meta.url))
var PACKAGE_ROOT = join(__dirname, '..')
var ASSETS_DIR = join(PACKAGE_ROOT, 'assets', 'cyrene')

/** MIME types for asset serving. */
var MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.moc3': 'application/octet-stream',
  '.model3.json': 'application/json',
  '.physics3.json': 'application/json',
  '.motion3.json': 'application/json',
  '.exp3.json': 'application/json',
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

/** The plugin apply function. */
export function apply(ctx) {
  // State: map of sessionId -> projection runtime
  var sessions = new Map()
  var currentPhase = { phase: 'idle', line: undefined, phrase: undefined, sessionActive: false }
  var celebrationTimeout = 2400
  var doneAt = null

  // Listen to session events
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

  // Build the current state snapshot
  function buildState() {
    var now = Date.now()
    var phase = currentPhase.phase
    var animation = animationForPhase(phase)
    if (phase === 'done' && doneAt !== null) {
      if (now - doneAt < celebrationTimeout) {
        animation = 'jumping'
      } else {
        animation = 'idle'
        phase = 'idle'
        currentPhase.phase = 'idle'
      }
    }
    var settled = phase === 'idle' || (phase === 'done' && doneAt !== null && now - doneAt >= celebrationTimeout)
    return {
      phase: phase,
      animation: animation,
      line: settled ? undefined : currentPhase.line,
      phrase: settled ? undefined : currentPhase.phrase,
      sessionActive: currentPhase.sessionActive,
      timestamp: now,
    }
  }

  // HTTP routes
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/cyrene-pet/state',
    handler: function (req, res) {
      json(res, 200, buildState())
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/cyrene-pet/info',
    handler: function (req, res) {
      json(res, 200, {
        name: '昔涟',
        description: '桌面陪伴者',
        assets: ['cyrene-avatar.png', 'model/Cyrene.model3.json'],
      })
    },
  })

  // GET current persisted config (position + zoom).
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/cyrene-pet/config',
    handler: function (req, res) {
      json(res, 200, petPosition)
    },
  })

  // Persist the pet's drag position and zoom.
  var petPosition = { right: 24, bottom: 20, zoom: 1 }
  var petSettings = { particles: true, gradient: true, idleAnim: true, phaseMotions: true }
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/cyrene-pet/set-config',
    handler: function (req, res) {
      var chunks = []
      req.on('data', function (c) { chunks.push(c) })
      req.on('end', function () {
        try {
          var body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (typeof body.right === 'number') petPosition.right = Math.max(0, Math.round(body.right))
          if (typeof body.bottom === 'number') petPosition.bottom = Math.max(0, Math.round(body.bottom))
          if (typeof body.zoom === 'number') petPosition.zoom = Math.max(0.5, Math.min(2, Math.round(body.zoom * 10) / 10))
          json(res, 200, { ok: true, config: petPosition })
        } catch (e) {
          json(res, 400, { ok: false, error: String(e) })
        }
      })
      req.on('error', function () { json(res, 400, { ok: false, error: 'read error' }) })
    },
  })

  // Plugin settings: feature toggles.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/cyrene-pet/settings',
    handler: function (req, res) {
      if (req.method === 'GET') {
        json(res, 200, petSettings)
      } else if (req.method === 'POST') {
        var chunks = []
        req.on('data', function (c) { chunks.push(c) })
        req.on('end', function () {
          try {
            var body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
            if (typeof body.particles === 'boolean') petSettings.particles = body.particles
            if (typeof body.gradient === 'boolean') petSettings.gradient = body.gradient
            if (typeof body.idleAnim === 'boolean') petSettings.idleAnim = body.idleAnim
            if (typeof body.phaseMotions === 'boolean') petSettings.phaseMotions = body.phaseMotions
            json(res, 200, { ok: true, settings: petSettings })
          } catch (e) {
            json(res, 400, { ok: false, error: String(e) })
          }
        })
        req.on('error', function () { json(res, 400, { ok: false, error: 'read error' }) })
      } else {
        json(res, 405, { ok: false, error: 'method not allowed' })
      }
    },
  })

  // Asset serving: /cyrene-pet/<filename>
  ctx.webServer.register({
    kind: 'prefix',
    path: '/cyrene-pet',
    handler: function (req, res) {
      try {
        var url = new URL(req.url, 'http://local')
        var pathname = url.pathname
        var segments = pathname.split('/').filter(Boolean)
        // path: /cyrene-pet/<filename>
        if (segments.length < 2 || segments[0] !== 'cyrene-pet') {
          res.writeHead(404)
          res.end()
          return
        }
        var filename = decodeURIComponent(segments.slice(1).join('/'))
        var filePath = join(ASSETS_DIR, filename)
        // Security: prevent directory traversal
        if (!filePath.startsWith(ASSETS_DIR)) {
          res.writeHead(403)
          res.end()
          return
        }
        if (!existsSync(filePath)) {
          res.writeHead(404)
          res.end()
          return
        }
        readFile(filePath).then(function (body) {
          res.writeHead(200, {
            'content-type': mimeFor(filePath),
            'content-length': String(body.byteLength),
            'cache-control': 'no-cache',
          })
          res.end(body)
        }, function () {
          res.writeHead(404)
          res.end()
        })
      } catch (e) {
        res.writeHead(500)
        res.end(String(e))
      }
    },
  })
}