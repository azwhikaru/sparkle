import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPreProxy, restorePersistedPreProxyRules } from '../src/main/core/preProxy'
import { applyPostProxy, restorePersistedPostProxyRules } from '../src/main/core/postProxy'
import { parseYaml, stringifyYaml } from '../src/main/utils/yaml'
import { normalizeThemeCss } from '../src/main/utils/theme-css'
import {
  parseMihomoRule,
  stringifyMihomoRule,
  validateMihomoRuleDraft
} from '../src/renderer/src/utils/mihomo-rule'
import {
  normalizeDelayTestConcurrency,
  runDelayTestsWithConcurrency
} from '../src/renderer/src/utils/delay-test'

const node = { type: 'socks5', server: '127.0.0.1', port: 1080, udp: true }
const createProfile = () =>
  ({
    mode: 'rule',
    proxies: [
      { name: '节点', type: 'ss', server: 'example.com', port: 443 },
      { name: '直连', type: 'direct' }
    ],
    'proxy-groups': [
      { name: '代理组', type: 'select', proxies: ['节点', 'DIRECT'], 'include-all': true }
    ],
    'proxy-providers': {
      订阅: { type: 'http', url: 'https://example.com', override: { udp: true } }
    },
    rules: [
      'DOMAIN,example.com,代理组',
      'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve,src',
      'AND,((DOMAIN,local.test),(NETWORK,TCP)),DIRECT',
      'SUB-RULE,(NETWORK,TCP),子规则',
      'MATCH,代理组'
    ],
    'sub-rules': { 子规则: ['DOMAIN,other.test,节点', 'MATCH,DIRECT'] }
  }) as unknown as MihomoConfig

test('disabled pre/post proxies leave subscriptions and rules intact', () => {
  const profile = createProfile()
  const original = structuredClone(profile)
  applyPreProxy(profile, { enable: false, node })
  applyPostProxy(profile, { enable: false, node })
  assert.deepEqual(profile, original)
})

test('preproxy chains remote nodes and providers without changing normal DIRECT traffic', () => {
  const profile = createProfile()
  const rules = [...profile.rules!]
  const originalNode = structuredClone(node)
  applyPreProxy(profile, { enable: true, node })
  assert.equal(profile.proxies![1]['dialer-proxy'], '前置代理')
  assert.equal(profile.proxies![2]['dialer-proxy'], undefined)
  assert.equal(profile.proxies![0]['dialer-proxy'], undefined)
  assert.equal(profile['proxy-providers']!.订阅.proxy, '前置代理')
  assert.deepEqual(profile['proxy-providers']!.订阅.override, {
    udp: true,
    'dialer-proxy': '前置代理'
  })
  assert.deepEqual(profile.rules, rules)
  assert.deepEqual(node, originalNode)
})

test('preproxy DIRECT option handles groups, nested rules and rule options', () => {
  const profile = createProfile()
  const rules = [...profile.rules!]
  applyPreProxy(profile, { enable: true, proxyDirect: true, node })
  assert.equal(profile.rules![1], 'IP-CIDR,10.0.0.0/8,前置代理,no-resolve,src')
  assert.equal(profile.rules![2], 'AND,((DOMAIN,local.test),(NETWORK,TCP)),前置代理')
  assert.equal(profile.rules![3], rules[3])
  assert.equal(profile['sub-rules']!.子规则[1], 'MATCH,前置代理')
  assert.deepEqual(profile['proxy-groups']![0].proxies, ['节点', '前置代理'])
  assert.deepEqual(restorePersistedPreProxyRules(profile.rules!), rules)
})

test('preproxy chooses a unique name and switches direct runtime mode for proxyDirect', () => {
  const profile = createProfile()
  profile.mode = 'direct'
  profile.proxies!.push({ ...node, name: '前置代理' }, { ...node, name: '前置代理_2' })
  applyPreProxy(profile, { enable: true, proxyDirect: true, node })
  assert.equal(profile.proxies![0].name, '前置代理_3')
  assert.equal(profile.mode, 'global')
})

test('postproxy shares landing nodes by target and preserves DIRECT and SUB-RULE', () => {
  const profile = createProfile()
  const rules = [...profile.rules!]
  profile['proxy-groups']![0]['exclude-filter'] = '旧排除'
  applyPostProxy(profile, { enable: true, node })
  const landingNodes = profile.proxies!.filter((proxy) => proxy.name.startsWith('__SPARKLE_POST'))
  assert.equal(landingNodes.length, 2)
  assert.equal(landingNodes[0]['dialer-proxy'], '代理组')
  assert.equal(landingNodes[1]['dialer-proxy'], '节点')
  assert.equal(profile.rules![0], `DOMAIN,example.com,${landingNodes[0].name}`)
  assert.equal(profile.rules![4], `MATCH,${landingNodes[0].name}`)
  assert.deepEqual(profile.rules!.slice(1, 4), rules.slice(1, 4))
  assert.equal(profile['sub-rules']!.子规则[0], `DOMAIN,other.test,${landingNodes[1].name}`)
  const exclude = new RegExp(String(profile['proxy-groups']![0]['exclude-filter']))
  assert.ok(exclude.test('旧排除'))
  assert.ok(exclude.test(landingNodes[0].name))
  assert.deepEqual(restorePersistedPostProxyRules(profile.rules!, profile.proxies), rules)
})

test('combined pre/post chain restores original editable rules without internal targets', () => {
  const profile = createProfile()
  const rules = [...profile.rules!]
  applyPreProxy(profile, { enable: true, proxyDirect: true, node })
  applyPostProxy(profile, { enable: true, node })
  assert.equal(profile.proxies!.find((proxy) => proxy.name === '节点')!['dialer-proxy'], '前置代理')
  assert.equal(profile.rules![1], 'IP-CIDR,10.0.0.0/8,前置代理,no-resolve,src')
  assert.deepEqual(
    restorePersistedPostProxyRules(restorePersistedPreProxyRules(profile.rules!), profile.proxies),
    rules
  )
})

test('persisted legacy preproxy targets migrate to DIRECT with options intact', () => {
  assert.deepEqual(
    restorePersistedPreProxyRules([
      'MATCH,__SPARKLE_PRE_PROXY_DIRECT___2',
      'IP-CIDR,10.0.0.0/8,__SPARKLE_PRE_PROXY__,no-resolve,src'
    ]),
    ['MATCH,DIRECT', 'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve,src']
  )
})

test('persisted postproxy chains recover original target and handle cycles', () => {
  const proxies = [
    { ...node, name: '__SPARKLE_POST_PROXY__', 'dialer-proxy': '__SPARKLE_POST_PROXY___2' },
    { ...node, name: '__SPARKLE_POST_PROXY___2', 'dialer-proxy': '代理组' }
  ]
  assert.deepEqual(restorePersistedPostProxyRules(['MATCH,__SPARKLE_POST_PROXY__'], proxies), [
    'MATCH,代理组'
  ])
  proxies[1]['dialer-proxy'] = '__SPARKLE_POST_PROXY__'
  assert.deepEqual(restorePersistedPostProxyRules(['MATCH,__SPARKLE_POST_PROXY__'], proxies), [
    'MATCH,DIRECT'
  ])
})

for (const rule of [
  'DOMAIN-SUFFIX,example.com,代理组',
  'IP-CIDR,10.0.0.0/8,DIRECT,no-resolve,src',
  'AND,((DOMAIN,example.com),(NETWORK,TCP)),代理组',
  'SUB-RULE,(NETWORK,TCP),子规则',
  'MATCH,DIRECT'
]) {
  test(`rule editor round trip: ${rule}`, () => {
    const draft = parseMihomoRule(rule)
    assert.equal(validateMihomoRuleDraft(draft), null)
    assert.equal(stringifyMihomoRule(draft), rule)
  })
}

test('rule editor preserves custom types and validates missing and malformed fields', () => {
  assert.equal(
    stringifyMihomoRule(parseMihomoRule('CUSTOM,example.com,代理组')),
    'CUSTOM,example.com,代理组'
  )
  for (const rule of ['DOMAIN,,DIRECT', 'MATCH,', 'AND,broken,DIRECT', 'SUB-RULE,broken,子规则']) {
    assert.ok(validateMihomoRuleDraft(parseMihomoRule(rule)))
  }
})

test('upstream YAML parsing preserves REALITY short IDs in fork proxy configurations', () => {
  const profile = parseYaml<MihomoConfig>(`
defaults: &defaults {type: vless, port: 443}
proxies:
  - <<: *defaults
    name: 节点
    reality-opts: {short-id: 000123}
  - {name: 二号, type: vless, reality-opts: {short-id: 0x1234}}
  - {name: 空值, type: vless, reality-opts: {short-id: null}}
rules: ["MATCH,DIRECT"]
`)
  assert.equal(profile.proxies![0].port, 443)
  const shortIds = profile.proxies!.map(
    (proxy) => (proxy['reality-opts'] as Record<string, unknown>)['short-id']
  )
  assert.deepEqual(shortIds, ['000123', '0x1234', null])
  applyPreProxy(profile, { enable: true, node })
  assert.deepEqual(parseYaml(stringifyYaml(profile)), profile)
  assert.throws(() => parseYaml('proxies: [unclosed'))
})

test('legacy themes retain their token bridge and modern themes remain unchanged', () => {
  const modern = ':root { --accent: red; }'
  assert.equal(normalizeThemeCss(modern), modern)
  const legacy = '.dark { --heroui-primary: 200 50% 50%; }'
  const normalized = normalizeThemeCss(legacy)
  assert.ok(normalized.startsWith(legacy))
  assert.ok(normalized.includes('--accent: hsl(var(--heroui-primary))'))
  assert.ok(normalized.includes('--segment: hsl(var(--heroui-primary))'))
  assert.ok(
    !normalizeThemeCss(`${legacy}\n${modern}`).includes('--accent: hsl(var(--heroui-primary))')
  )
})

test('delay tests respect concurrency limits, visit each node once and handle an empty group', async () => {
  let active = 0
  let peak = 0
  const visited: number[] = []
  const items = Array.from({ length: 9 }, (_, i) => i)
  await runDelayTestsWithConcurrency(items, 3, async (item) => {
    active++
    peak = Math.max(peak, active)
    await new Promise((resolve) => {
      setTimeout(resolve, 1)
    })
    visited.push(item)
    active--
  })
  assert.equal(peak, 3)
  assert.deepEqual(
    visited.sort((a, b) => a - b),
    items
  )
  await runDelayTestsWithConcurrency([], 3, async () => assert.fail('empty group ran a test'))
  assert.equal(normalizeDelayTestConcurrency(undefined), 50)
  assert.equal(normalizeDelayTestConcurrency(-1), 1)
  assert.equal(normalizeDelayTestConcurrency(9999), 512)
})
