const PRE_PROXY_BASE_NAME = '前置代理'
const PRE_PROXY_PATTERN = /^前置代理(?:_\d+)?$/
const LOCAL_PROXY_TYPES = new Set(['direct', 'reject', 'reject-drop', 'pass', 'compatible', 'dns'])

function nextProxyName(baseName: string, proxies: MihomoProxy[]): string {
  const names = new Set(proxies.map((proxy) => proxy.name))
  if (!names.has(baseName)) return baseName

  let suffix = 2
  while (names.has(`${baseName}_${suffix}`)) suffix++
  return `${baseName}_${suffix}`
}

function isProxyNode(value: unknown): value is MihomoProxy {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Partial<MihomoProxy>).name === 'string' &&
      typeof (value as Partial<MihomoProxy>).type === 'string'
  )
}

export function isPreProxyName(name: string): boolean {
  return PRE_PROXY_PATTERN.test(name)
}

export function getPreProxyName(profile?: MihomoConfig): string | undefined {
  if (!Array.isArray(profile?.proxies)) return undefined
  return profile.proxies.find((proxy) => isProxyNode(proxy) && isPreProxyName(proxy.name))?.name
}

function splitRule(rule: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (const character of rule) {
    if (character === '(') depth += 1
    if (character === ')' && depth > 0) depth -= 1

    if (character === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }

  parts.push(current.trim())
  return parts
}

function rewriteDirectRule(rule: string, targetProxyName: string): string {
  const parts = splitRule(rule)
  const type = parts[0]?.toUpperCase()
  if (!type || type === 'SUB-RULE' || parts.length < 2) return rule

  let targetIndex = parts.length - 1
  while (targetIndex > 0) {
    const option = parts[targetIndex].toLowerCase()
    if (option !== 'no-resolve' && option !== 'src') break
    targetIndex -= 1
  }

  if (parts[targetIndex]?.toUpperCase() !== 'DIRECT') return rule
  parts[targetIndex] = targetProxyName
  return parts.join(',')
}

function rewriteDirectTargets(profile: MihomoConfig, targetProxyName: string): void {
  if (Array.isArray(profile.rules)) {
    profile.rules = profile.rules.map((rule) =>
      typeof rule === 'string' ? rewriteDirectRule(rule, targetProxyName) : rule
    )
  }

  if (profile['sub-rules'] && typeof profile['sub-rules'] === 'object') {
    profile['sub-rules'] = Object.fromEntries(
      Object.entries(profile['sub-rules']).map(([name, rules]) => [
        name,
        Array.isArray(rules)
          ? rules.map((rule) =>
              typeof rule === 'string' ? rewriteDirectRule(rule, targetProxyName) : rule
            )
          : rules
      ])
    )
  }

  profile['proxy-groups'] = profile['proxy-groups']?.map((group) => ({
    ...group,
    proxies: Array.isArray(group.proxies)
      ? group.proxies.map((name) =>
          typeof name === 'string' && name.toUpperCase() === 'DIRECT' ? targetProxyName : name
        )
      : group.proxies
  }))
}

/**
 * Adds the configured upstream node and routes every remote proxy connection through it.
 * Provider downloads and provider nodes also use the upstream proxy.
 */
export function applyPreProxy(profile: MihomoConfig, config?: IPreProxyConfig): void {
  if (!config?.enable || !config.node || typeof config.node !== 'object') return
  if (typeof config.node.type !== 'string' || config.node.type.trim() === '') return

  const proxies = Array.isArray(profile.proxies) ? profile.proxies.filter(isProxyNode) : []
  const preProxyName = nextProxyName(PRE_PROXY_BASE_NAME, proxies)
  const preProxy = {
    ...config.node,
    name: preProxyName
  } as MihomoProxy
  delete preProxy['dialer-proxy']

  const chainedProxies = proxies.map((proxy) => {
    if (LOCAL_PROXY_TYPES.has(proxy.type.toLowerCase())) return proxy
    return { ...proxy, 'dialer-proxy': preProxyName }
  })
  if (config.proxyDirect) {
    profile.proxies = [preProxy, ...chainedProxies]
    rewriteDirectTargets(profile, preProxyName)
    if (profile.mode === 'direct') profile.mode = 'global'
  } else {
    profile.proxies = [preProxy, ...chainedProxies]
  }

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
