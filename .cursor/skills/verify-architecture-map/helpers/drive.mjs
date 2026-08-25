import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const feature = process.argv[2]
const features = new Set(['city-browse', 'play-a-flow', 'rail-types', 'repeated-step'])
if (!features.has(feature)) {
  console.error('usage: node .cursor/skills/verify-architecture-map/helpers/drive.mjs city-browse|play-a-flow|rail-types|repeated-step')
  process.exit(2)
}

const url = 'http://127.0.0.1:5197'
const storeModuleUrl = `/@fs${resolve('architecture-map/assets/stores/useMapView.ts').replaceAll('\\', '/')}`
const evidenceDir = '/opt/cursor/artifacts/verify-architecture-map'
const screenshotPath = `${evidenceDir}/${feature}.png`
const consolePath = `${evidenceDir}/${feature}.console.txt`
const profileDir = `/tmp/verify-architecture-map-chrome-${process.pid}`
const consoleEntries = []
const assertions = []
let favicon404Seen = false

await mkdir(evidenceDir, { recursive: true })
await mkdir(profileDir, { recursive: true })

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })

let chromeStderr = ''
chrome.stderr.on('data', (chunk) => {
  chromeStderr += chunk.toString()
})

let socket
let nextId = 0
const pending = new Map()
const eventWaiters = new Map()

function record(level, source, text) {
  consoleEntries.push({ level, source, text })
}

function assert(value, label) {
  if (!value) throw new Error(`assertion failed: ${label}`)
  assertions.push(`${label}=pass`)
}

function check(value, label, failures) {
  assertions.push(`${label}=${value ? 'pass' : 'fail'}`)
  if (!value) failures.push(label)
}

function waitForEvent(method, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs)
    const waiters = eventWaiters.get(method) ?? []
    waiters.push((params) => {
      clearTimeout(timer)
      resolve(params)
    })
    eventWaiters.set(method, waiters)
  })
}

function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text)
  }
  return response.result.value
}

async function clickButton(text) {
  const clicked = await evaluate(`(() => {
    const target = ${JSON.stringify(text)}
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.replace(/\\s+/g, ' ').trim().includes(target)
    )
    if (!button) return false
    button.click()
    return true
  })()`)
  assert(clicked, `click-${text.toLowerCase().replaceAll(' ', '-')}`)
}

async function capture() {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  await writeFile(screenshotPath, Buffer.from(data, 'base64'))
}

async function connect() {
  let port
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const activePort = await readFile(`${profileDir}/DevToolsActivePort`, 'utf8')
      port = Number(activePort.split(/\r?\n/, 1)[0])
      if (Number.isInteger(port) && port > 0) break
    } catch {
      await delay(50)
    }
  }
  if (!port) throw new Error(`Chrome did not expose CDP\n${chromeStderr}`)

  const targetResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' },
  )
  if (!targetResponse.ok) throw new Error(`CDP target failed: ${targetResponse.status}`)
  const target = await targetResponse.json()

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data))
    if (message.id) {
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
      return
    }

    const waiters = eventWaiters.get(message.method)
    const waiter = waiters?.shift()
    if (waiter) waiter(message.params)

    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args
        .map((arg) => arg.value ?? arg.description ?? arg.type)
        .join(' ')
      record(message.params.type, 'console', text)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      record('error', 'exception', message.params.exceptionDetails.text)
    }
    if (message.method === 'Log.entryAdded') {
      const entry = message.params.entry
      const favicon404 =
        entry.url?.endsWith('/favicon.ico') ||
        (favicon404Seen && entry.source === 'network' && entry.text.includes('404'))
      record(
        favicon404 ? 'ignored' : entry.level,
        entry.source,
        `${entry.text}${entry.url ? ` ${entry.url}` : ''}`,
      )
    }
    if (message.method === 'Network.loadingFailed' && !message.params.canceled) {
      record('error', 'network', `${message.params.errorText} ${message.params.type}`)
    }
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      const favicon404 = message.params.response.url.endsWith('/favicon.ico')
      favicon404Seen ||= favicon404
      record(
        favicon404 ? 'ignored' : 'error',
        'network',
        `${message.params.response.status} ${message.params.response.url}`,
      )
    }
  })

  await Promise.all([
    send('Page.enable'),
    send('Runtime.enable'),
    send('Log.enable'),
    send('Network.enable'),
    send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ])

  const loaded = waitForEvent('Page.loadEventFired')
  await send('Page.navigate', { url })
  await loaded
  await delay(500)
}

async function cityBrowse() {
  const state = await evaluate(`(() => {
    const svg = document.querySelector('svg')
    const svgText = svg?.textContent?.toUpperCase() ?? ''
    return {
      footer: document.body.innerText.toLowerCase().includes('choose a flow'),
      districts: ['THE CONTRACT', 'THE FLOOR', 'THE NARRATION', 'THE STAGE']
        .every((label) => svgText.includes(label)),
      buildings: svg?.querySelectorAll('[role="button"]').length ?? 0,
    }
  })()`)
  assert(state.footer, 'city-footer')
  assert(state.districts, 'city-districts')
  assert(state.buildings >= 10, 'city-buildings')
}

async function playAFlow() {
  await clickButton('Play a flow')
  await delay(1700)

  const state = await evaluate(`(() => {
    const svg = document.querySelector('svg')
    const svgText = svg?.textContent?.toUpperCase() ?? ''
    const packet = [...(svg?.querySelectorAll('circle') ?? [])].find((circle) =>
      circle.getAttribute('fill')?.includes('--am-accent')
    )
    const flowButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Play a flow')
    )
    return {
      footer: document.body.innerText.toLowerCase().includes('sequence of this flow'),
      noDistricts: !svgText.includes('THE CONTRACT'),
      participants: svg?.querySelectorAll('[role="button"]').length ?? 0,
      lifelines: [...(svg?.querySelectorAll('line') ?? [])]
        .filter((line) => line.getAttribute('stroke-opacity') === '0.35').length,
      active: flowButton?.getAttribute('aria-pressed') === 'true',
      packet: packet ? [packet.getAttribute('cx'), packet.getAttribute('cy')] : null,
    }
  })()`)

  assert(state.footer, 'sequence-footer')
  assert(state.noDistricts, 'sequence-replaces-city')
  assert(state.participants >= 2, 'sequence-participants')
  assert(state.lifelines >= 2, 'sequence-lifelines')
  assert(state.active, 'sequence-flow-active')
  assert(state.packet, 'sequence-packet-present')

  await delay(450)
  const nextPacket = await evaluate(`(() => {
    const packet = [...document.querySelectorAll('svg circle')].find((circle) =>
      circle.getAttribute('fill')?.includes('--am-accent')
    )
    return packet ? [packet.getAttribute('cx'), packet.getAttribute('cy')] : null
  })()`)
  assert(
    nextPacket && (nextPacket[0] !== state.packet[0] || nextPacket[1] !== state.packet[1]),
    'sequence-packet-ticks',
  )
}

async function railTypes() {
  await clickButton('Play a flow')
  await delay(300)
  const clicked = await evaluate(`(() => {
    const button = document.getElementById('am-rail-types')
    if (!button) return false
    button.click()
    return true
  })()`)
  assert(clicked, 'click-types')
  await delay(300)

  const state = await evaluate(`(() => {
    const svg = document.querySelector('svg')
    const svgText = svg?.textContent?.toUpperCase() ?? ''
    const flowButton = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Play a flow')
    )
    const typesButton = document.getElementById('am-rail-types')
    const panelTitle = [...document.querySelectorAll('aside h2')].at(-1)?.textContent
    return {
      footer: document.body.innerText.toLowerCase().includes('choose a flow'),
      city: svgText.includes('THE CONTRACT'),
      flowInactive: flowButton?.getAttribute('aria-pressed') === 'false',
      typesActive: typesButton?.getAttribute('aria-pressed') === 'true',
      panelTitle,
    }
  })()`)

  assert(state.footer, 'types-city-footer')
  assert(state.city, 'types-city-canvas')
  assert(state.flowInactive, 'types-flow-cleared')
  assert(state.typesActive, 'types-rail-selected')
  assert(state.panelTitle === 'Types', 'types-panel')
}

async function repeatedStep() {
  const installed = await evaluate(`(async () => {
    const graph = await import('/src/graph.ts')
    const view = await import(${JSON.stringify(storeModuleUrl)})
    const flow = graph.FLOWS.find((candidate) => candidate.id === 'narrate')
    if (!flow) return false
    flow.route.splice(0, flow.route.length, 'rail-view', 'rail-view')
    view.setActiveFlow(null)
    await new Promise(requestAnimationFrame)
    view.setActiveFlow(flow.id)
    return true
  })()`)
  assert(installed, 'repeated-route-installed')
  await delay(1700)

  const beforeHover = await evaluate(`(() => {
    const hitTargets = [...document.querySelectorAll('svg polyline[stroke="transparent"]')]
    const lines = hitTargets.map((target) =>
      target.parentElement?.querySelector('polyline:not([stroke="transparent"])')
    )
    const messageHeading = [...document.querySelectorAll('aside h3')].find((heading) =>
      heading.textContent === 'Messages'
    )
    const rows = [...(messageHeading?.parentElement?.querySelectorAll('li') ?? [])]
    const badges = [...document.querySelectorAll('svg circle[r="8"]')]
    return {
      lineCount: lines.length,
      strokes: lines.map((line) => line?.getAttribute('stroke')),
      currentLines: lines.filter((line) =>
        line?.getAttribute('stroke')?.includes('--am-accent')
      ).length,
      currentRows: rows.filter((row) =>
        row.style.color.includes('--am-accent')
      ).length,
      badgeAtMidpoint: badges.map((badge, index) => {
        const line = lines[index]
        if (!line) return false
        const midpoint = line.getPointAtLength(line.getTotalLength() / 2)
        return Math.hypot(
          Number(badge.getAttribute('cx')) - midpoint.x,
          Number(badge.getAttribute('cy')) - midpoint.y,
        ) < 0.1
      }),
      badgeAtEnd: badges.map((badge, index) => {
        const line = lines[index]
        if (!line) return false
        const end = line.getPointAtLength(line.getTotalLength())
        return Math.hypot(
          Number(badge.getAttribute('cx')) - end.x,
          Number(badge.getAttribute('cy')) - end.y,
        ) < 0.1
      }),
    }
  })()`)

  const hovered = await evaluate(`(() => {
    const targets = [...document.querySelectorAll('svg polyline[stroke="transparent"]')]
    const target = targets[1]
    if (!target) return false
    target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    return true
  })()`)
  assert(hovered, 'repeated-second-hovered')
  await delay(200)

  const afterHover = await evaluate(`(() =>
    [...document.querySelectorAll('svg polyline[stroke="transparent"]')].map((target) =>
      target.parentElement
        ?.querySelector('polyline:not([stroke="transparent"])')
        ?.getAttribute('stroke')
    )
  )()`)

  const changedLines = afterHover
    .map((stroke, index) => stroke === beforeHover.strokes[index] ? -1 : index)
    .filter((index) => index >= 0)
  const failures = []
  check(beforeHover.lineCount === 2, 'repeated-two-lines', failures)
  check(beforeHover.currentLines === 1, 'repeated-one-current-line', failures)
  check(beforeHover.currentRows === 1, 'repeated-one-current-row', failures)
  check(
    beforeHover.badgeAtMidpoint.length === 2 && beforeHover.badgeAtMidpoint.every(Boolean),
    'repeated-badges-at-midpoint',
    failures,
  )
  check(beforeHover.badgeAtEnd.every((atEnd) => !atEnd), 'repeated-badges-off-arrowhead', failures)
  check(
    changedLines.length === 1 && changedLines[0] === 1,
    'repeated-hover-lights-one-copy',
    failures,
  )
  if (failures.length > 0) {
    throw new Error(`failed checks: ${failures.join(', ')}`)
  }
}

let failure
try {
  await connect()
  if (feature === 'city-browse') await cityBrowse()
  if (feature === 'play-a-flow') await playAFlow()
  if (feature === 'rail-types') await railTypes()
  if (feature === 'repeated-step') await repeatedStep()
  await capture()

  const errors = consoleEntries.filter((entry) => entry.level === 'error')
  assert(errors.length === 0, 'console-errors')
} catch (error) {
  failure = error
  try {
    if (socket?.readyState === WebSocket.OPEN) await capture()
  } catch {
    record('error', 'driver', 'failed to capture failure screenshot')
  }
} finally {
  const lines = [
    `feature=${feature}`,
    `url=${url}`,
    ...assertions,
    ...consoleEntries.map((entry) =>
      `console level=${entry.level} source=${entry.source} text=${entry.text.replaceAll('\n', ' ')}`
    ),
    `RESULT=${failure ? 'FAIL' : 'PASS'}`,
  ]
  if (failure) lines.push(`failure=${failure.message}`)
  await writeFile(consolePath, `${lines.join('\n')}\n`)

  if (socket?.readyState === WebSocket.OPEN) socket.close()
  chrome.kill('SIGTERM')
  await Promise.race([once(chrome, 'exit'), delay(2000)])
  if (chrome.exitCode === null) chrome.kill('SIGKILL')
  await delay(200)
  await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
}

console.log(`feature=${feature}`)
for (const assertion of assertions) console.log(assertion)
console.log(`screenshot=${screenshotPath}`)
console.log(`console=${consolePath}`)
console.log(`RESULT=${failure ? 'FAIL' : 'PASS'}`)
if (failure) {
  console.error(failure.message)
  process.exit(1)
}
