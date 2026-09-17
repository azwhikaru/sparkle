import { isPreProxyName } from './preProxy'

const POST_PROXY_BASE_NAME = '__SPARKLE_POST_PROXY__'
const LOCAL_TARGETS = new Set([
  'DIRECT',
  'REJECT',
  'REJECT-DROP',
  'PASS',
  'COMPATIBLE',
  'DNS',
  'GLOBAL'
])
const POST_PROXY_EXCLUDE_PATTERN = '^__SPARKLE_POST_PROXY__(?:_\\d+)?$'

function isProxyNode(value: unknown): value is MihomoProxy {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Partial<MihomoProxy>).name === 'string' &&
      typeof (value as Partial<MihomoProxy>).type === 'string'
  )
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

function createNameFactory(proxies: MihomoProxy[]): () => string {
  const names = new Set(proxies.map((proxy) => proxy.name))
  let suffix = 1

  return () => {
    let name = suffix === 1 ? POST_PROXY_BASE_NAME : `${POST_PROXY_BASE_NAME}_${suffix}`
    while (names.has(name)) {
      suffix += 1
      name = `${POST_PROXY_BASE_NAME}_${suffix}`
    }
    names.add(name)
    suffix += 1
    return name
  }
}

/**
 * Makes the configured node the final hop for rule-based proxy targets.
 * Each distinct target gets a landing-node clone whose dialer-proxy points to the original target.
 */
export function applyPostProxy(profile: MihomoConfig, config?: IPostProxyConfig): void {
  if (!config?.enable || !config.node || typeof config.node !== 'object') return
  if (typeof config.node.type !== 'string' || config.node.type.trim() === '') return

  const proxies = Array.isArray(profile.proxies) ? profile.proxies.filter(isProxyNode) : []
  const nextName = createNameFactory(proxies)
  const landingNodes = new Map<string, MihomoProxy>()

  const rewriteRule = (rule: string): string => {
    const parts = splitRule(rule)
    const type = parts[0]?.toUpperCase()
    if (!type || type === 'SUB-RULE' || parts.length < 2) return rule

    let targetIndex = parts.length - 1
    while (targetIndex > 0) {
      const option = parts[targetIndex].toLowerCase()
      if (option !== 'no-resolve' && option !== 'src') break
      targetIndex -= 1
    }

    const target = parts[targetIndex]
    if (!target || LOCAL_TARGETS.has(target.toUpperCase()) || isPreProxyName(target)) {
      return rule
    }

    let landingNode = landingNodes.get(target)
    if (!landingNode) {
      landingNode = {
        ...config.node,
        name: nextName(),
        'dialer-proxy': target
      } as MihomoProxy
      landingNodes.set(target, landingNode)
    }
    parts[targetIndex] = landingNode.name
    return parts.join(',')
  }

  if (Array.isArray(profile.rules)) {
    profile.rules = profile.rules.map((rule) => (typeof rule === 'string' ? rewriteRule(rule) : rule))
  }

  if (profile['sub-rules'] && typeof profile['sub-rules'] === 'object') {
    profile['sub-rules'] = Object.fromEntries(
      Object.entries(profile['sub-rules']).map(([name, rules]) => [
        name,
        Array.isArray(rules)
          ? rules.map((rule) => (typeof rule === 'string' ? rewriteRule(rule) : rule))
          : rules
      ])
    )
  }

  if (landingNodes.size > 0) {
    profile.proxies = [...landingNodes.values(), ...proxies]
    profile['proxy-groups'] = profile['proxy-groups']?.map((group) => {
      if (!group['include-all'] && !group['include-all-proxies']) return group
      const excludeFilter =
        typeof group['exclude-filter'] === 'string' ? group['exclude-filter'].trim() : ''
      return {
        ...group,
        'exclude-filter': excludeFilter
          ? `(?:${excludeFilter})|(?:${POST_PROXY_EXCLUDE_PATTERN})`
          : POST_PROXY_EXCLUDE_PATTERN
      }
    })
  }
}
