import { readFile } from 'fs/promises'
import net from 'net'
import path from 'path'
import { getAppConfig, getProfileConfig } from '../config'
import { mihomoProfileWorkDir, mihomoWorkDir } from '../utils/dirs'
import { parseYaml } from '../utils/yaml'
import { getRuntimeConfig } from './factory'

interface ProxyEndpoint {
  host: string
  port?: number
}

interface ProviderFile {
  proxies?: MihomoProxy[]
}

const endpointCache = new Map<string, { expiresAt: number; value: Promise<ProxyEndpoint> }>()
const ENDPOINT_CACHE_TTL = 5000

function normalizeHost(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const host = value.trim().replace(/^\[|\]$/g, '')
  if (!host || host.startsWith('-') || /[\r\n\0]/.test(host)) return undefined
  return host
}

function normalizePort(value: unknown): number | undefined {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined
  return port
}

function endpointFromProxy(proxy: MihomoProxy | undefined): ProxyEndpoint | undefined {
  if (!proxy) return undefined
  const host = normalizeHost(proxy.server)
  if (!host) return undefined
  return { host, port: normalizePort(proxy.port) }
}

function providerFileProxies(content: string): MihomoProxy[] {
  const parsed = parseYaml<ProviderFile | MihomoProxy[]>(content)
  if (Array.isArray(parsed)) return parsed
  return Array.isArray(parsed?.proxies) ? parsed.proxies : []
}

async function currentWorkDir(): Promise<string> {
  const [{ diffWorkDir = false }, { current }] = await Promise.all([
    getAppConfig(),
    getProfileConfig()
  ])
  return diffWorkDir ? mihomoProfileWorkDir(current) : mihomoWorkDir()
}

async function resolveEndpointUncached(
  proxyName: string,
  providerName?: string
): Promise<ProxyEndpoint> {
  const runtime = await getRuntimeConfig()
  const inlineProxy = runtime.proxies?.find((proxy) => proxy.name === proxyName)
  const inlineEndpoint = endpointFromProxy(inlineProxy)
  if (inlineEndpoint) return inlineEndpoint

  const providers = runtime['proxy-providers'] ?? {}
  const providerEntries = providerName
    ? [[providerName, providers[providerName]] as const]
    : Object.entries(providers)
  const workDir = await currentWorkDir()

  for (const [, provider] of providerEntries) {
    if (!provider || typeof provider !== 'object') continue
    const providerPath = typeof provider.path === 'string' ? provider.path.trim() : ''
    if (!providerPath) continue
    const resolvedPath = path.isAbsolute(providerPath)
      ? providerPath
      : path.resolve(workDir, providerPath)
    try {
      const content = await readFile(resolvedPath, 'utf8')
      const proxy = providerFileProxies(content).find((item) => item.name === proxyName)
      const endpoint = endpointFromProxy(proxy)
      if (endpoint) return endpoint
    } catch {
      // Continue searching other provider cache files.
    }
  }

  throw new Error(`无法获取节点“${proxyName}”的服务器地址`)
}

export async function resolveProxyEndpoint(
  proxyName: string,
  providerName?: string
): Promise<ProxyEndpoint> {
  const key = `${providerName ?? ''}\0${proxyName}`
  const now = Date.now()
  const cached = endpointCache.get(key)
  if (cached && cached.expiresAt > now) return await cached.value

  const value = resolveEndpointUncached(proxyName, providerName)
  endpointCache.set(key, { expiresAt: now + ENDPOINT_CACHE_TTL, value })
  try {
    return await value
  } catch (error) {
    endpointCache.delete(key)
    throw error
  }
}

export async function pingEndpoint(host: string, timeout: number): Promise<number> {
  const safeTimeout = Math.max(100, Math.floor(timeout))
  try {
    const { ping } = await import('@bobfrankston/neoping')
    const [result] = await ping(host, {
      count: 1,
      timeout: safeTimeout,
      rdns: false,
      arp: false,
      diagnostics: false
    })
    const reply = result?.replies.find((item) => item.alive)
    return reply ? Math.max(1, Math.round(reply.rtt)) : 0
  } catch {
    return 0
  }
}

export async function tcpingEndpoint(
  host: string,
  port: number | undefined,
  timeout: number
): Promise<number> {
  if (!port) throw new Error(`节点“${host}”没有可用于 TCPing 的端口`)
  const safeTimeout = Math.max(100, Math.floor(timeout))

  return await new Promise((resolve) => {
    const startedAt = process.hrtime.bigint()
    const socket = net.createConnection({ host, port })
    let completed = false
    const finish = (delay: number): void => {
      if (completed) return
      completed = true
      socket.destroy()
      resolve(delay)
    }

    socket.setTimeout(safeTimeout)
    socket.once('connect', () => {
      const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      finish(Math.max(1, Math.round(elapsed)))
    })
    socket.once('timeout', () => finish(0))
    socket.once('error', () => finish(0))
  })
}

export function happyDelay(minimum: number | undefined, maximum: number | undefined): number {
  const first =
    typeof minimum === 'number' && Number.isFinite(minimum)
      ? Math.min(65535, Math.max(0, Math.floor(minimum)))
      : 50
  const second =
    typeof maximum === 'number' && Number.isFinite(maximum)
      ? Math.min(65535, Math.max(0, Math.floor(maximum)))
      : 200
  const min = Math.min(first, second)
  const max = Math.max(first, second)
  return min + Math.floor(Math.random() * (max - min + 1))
}
