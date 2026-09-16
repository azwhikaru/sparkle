const PRE_PROXY_BASE_NAME = '__SPARKLE_PRE_PROXY__'
const LOCAL_PROXY_TYPES = new Set(['direct', 'reject', 'reject-drop', 'pass', 'compatible', 'dns'])

function nextPreProxyName(proxies: MihomoProxy[]): string {
  const names = new Set(proxies.map((proxy) => proxy.name))
  if (!names.has(PRE_PROXY_BASE_NAME)) return PRE_PROXY_BASE_NAME

  let suffix = 2
  while (names.has(`${PRE_PROXY_BASE_NAME}_${suffix}`)) suffix++
  return `${PRE_PROXY_BASE_NAME}_${suffix}`
}

function isProxyNode(value: unknown): value is MihomoProxy {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Partial<MihomoProxy>).name === 'string' &&
      typeof (value as Partial<MihomoProxy>).type === 'string'
  )
}

/**
 * Adds the configured upstream node and routes every remote proxy connection through it.
 * Provider downloads and provider nodes also use the upstream proxy.
 */
export function applyPreProxy(profile: MihomoConfig, config?: IPreProxyConfig): void {
  if (!config?.enable || !config.node || typeof config.node !== 'object') return
  if (typeof config.node.type !== 'string' || config.node.type.trim() === '') return

  const proxies = Array.isArray(profile.proxies) ? profile.proxies.filter(isProxyNode) : []
  const preProxyName = nextPreProxyName(proxies)
  const preProxy = {
    ...config.node,
    name: preProxyName
  } as MihomoProxy
  delete preProxy['dialer-proxy']

  const chainedProxies = proxies.map((proxy) => {
    if (LOCAL_PROXY_TYPES.has(proxy.type.toLowerCase())) return proxy
    return { ...proxy, 'dialer-proxy': preProxyName }
  })
  profile.proxies = [preProxy, ...chainedProxies]

  if (!profile['proxy-providers'] || typeof profile['proxy-providers'] !== 'object') return
  profile['proxy-providers'] = Object.fromEntries(
    Object.entries(profile['proxy-providers']).map(([name, provider]) => {
      const providerConfig =
        provider && typeof provider === 'object' ? provider : ({} as MihomoProxyProvider)
      return [
        name,
        {
          ...providerConfig,
          proxy: preProxyName,
          override: {
            ...(providerConfig.override && typeof providerConfig.override === 'object'
              ? providerConfig.override
              : {}),
            'dialer-proxy': preProxyName
          }
        }
      ]
    })
  )
}
