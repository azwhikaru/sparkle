export interface MihomoRuleTypeOption {
  type: string
  description: string
  payloadLabel: string
  placeholder: string
  supportsIpOptions?: boolean
}

export interface MihomoRuleDraft {
  type: string
  payload: string
  target: string
  noResolve: boolean
  sourceIp: boolean
}

export const MIHOMO_RULE_TYPES: MihomoRuleTypeOption[] = [
  {
    type: 'DOMAIN',
    description: '匹配完整域名',
    payloadLabel: '域名',
    placeholder: 'example.com'
  },
  {
    type: 'DOMAIN-SUFFIX',
    description: '匹配域名后缀',
    payloadLabel: '域名后缀',
    placeholder: 'example.com'
  },
  {
    type: 'DOMAIN-KEYWORD',
    description: '匹配域名关键字',
    payloadLabel: '关键字',
    placeholder: 'google'
  },
  {
    type: 'DOMAIN-WILDCARD',
    description: '匹配域名通配符',
    payloadLabel: '域名通配符',
    placeholder: '*.example.com'
  },
  {
    type: 'DOMAIN-REGEX',
    description: '使用正则表达式匹配域名',
    payloadLabel: '域名正则表达式',
    placeholder: '^.+\\.example\\.com$'
  },
  {
    type: 'GEOSITE',
    description: '匹配 Geosite 域名集合',
    payloadLabel: 'Geosite 类别',
    placeholder: 'youtube'
  },
  {
    type: 'GEOIP',
    description: '匹配目标 IP 所属国家或地区',
    payloadLabel: '国家 / 地区代码',
    placeholder: 'CN',
    supportsIpOptions: true
  },
  {
    type: 'SRC-GEOIP',
    description: '匹配来源 IP 所属国家或地区',
    payloadLabel: '国家 / 地区代码',
    placeholder: 'CN'
  },
  {
    type: 'IP-ASN',
    description: '匹配目标 IP 所属 ASN',
    payloadLabel: 'ASN',
    placeholder: '13335',
    supportsIpOptions: true
  },
  {
    type: 'SRC-IP-ASN',
    description: '匹配来源 IP 所属 ASN',
    payloadLabel: 'ASN',
    placeholder: '9808'
  },
  {
    type: 'IP-CIDR',
    description: '匹配目标 IPv4 / IPv6 网段',
    payloadLabel: 'IP 地址 / 网段',
    placeholder: '192.168.0.0/16',
    supportsIpOptions: true
  },
  {
    type: 'IP-CIDR6',
    description: '匹配目标 IP 网段（IP-CIDR 别名）',
    payloadLabel: 'IP 地址 / 网段',
    placeholder: '2001:db8::/32',
    supportsIpOptions: true
  },
  {
    type: 'SRC-IP-CIDR',
    description: '匹配来源 IP 网段',
    payloadLabel: '来源 IP 地址 / 网段',
    placeholder: '192.168.1.0/24'
  },
  {
    type: 'IP-SUFFIX',
    description: '匹配目标 IP 后缀范围',
    payloadLabel: 'IP 后缀范围',
    placeholder: '8.8.8.8/24',
    supportsIpOptions: true
  },
  {
    type: 'SRC-IP-SUFFIX',
    description: '匹配来源 IP 后缀范围',
    payloadLabel: '来源 IP 后缀范围',
    placeholder: '192.168.1.201/8'
  },
  {
    type: 'DST-PORT',
    description: '匹配目标端口或端口范围',
    payloadLabel: '目标端口',
    placeholder: '80 或 8000-9000'
  },
  {
    type: 'SRC-PORT',
    description: '匹配来源端口或端口范围',
    payloadLabel: '来源端口',
    placeholder: '7777 或 7000-8000'
  },
  {
    type: 'IN-PORT',
    description: '匹配入站端口或端口范围',
    payloadLabel: '入站端口',
    placeholder: '7890 或 7890-7893'
  },
  {
    type: 'IN-TYPE',
    description: '匹配入站类型',
    payloadLabel: '入站类型',
    placeholder: 'SOCKS/HTTP'
  },
  {
    type: 'IN-USER',
    description: '匹配入站用户名，多个用户名用 / 分隔',
    payloadLabel: '入站用户名',
    placeholder: 'user1/user2'
  },
  {
    type: 'IN-NAME',
    description: '匹配入站名称',
    payloadLabel: '入站名称',
    placeholder: 'mixed-in'
  },
  {
    type: 'REMATCH-NAME',
    description: '匹配 rematch 出站写入的名称',
    payloadLabel: '重匹配名称',
    placeholder: 'rematch1'
  },
  {
    type: 'PROCESS-PATH',
    description: '匹配完整进程路径',
    payloadLabel: '进程路径',
    placeholder: 'C:\\Program Files\\App\\app.exe'
  },
  {
    type: 'PROCESS-PATH-WILDCARD',
    description: '使用 * 和 ? 通配进程路径',
    payloadLabel: '进程路径通配符',
    placeholder: 'C:\\Program Files\\*\\app.exe'
  },
  {
    type: 'PROCESS-PATH-REGEX',
    description: '使用正则表达式匹配进程路径',
    payloadLabel: '进程路径正则表达式',
    placeholder: '.*\\\\app\\.exe$'
  },
  {
    type: 'PROCESS-NAME',
    description: '匹配进程名称或 Android 包名',
    payloadLabel: '进程名称',
    placeholder: 'chrome.exe'
  },
  {
    type: 'PROCESS-NAME-WILDCARD',
    description: '使用 * 和 ? 通配进程名称',
    payloadLabel: '进程名称通配符',
    placeholder: '*telegram*'
  },
  {
    type: 'PROCESS-NAME-REGEX',
    description: '使用正则表达式匹配进程名称',
    payloadLabel: '进程名称正则表达式',
    placeholder: '(?i)telegram'
  },
  {
    type: 'UID',
    description: '匹配 Linux 用户 ID',
    payloadLabel: '用户 ID',
    placeholder: '1001'
  },
  {
    type: 'NETWORK',
    description: '匹配 TCP 或 UDP',
    payloadLabel: '网络协议',
    placeholder: 'tcp 或 udp'
  },
  {
    type: 'DSCP',
    description: '匹配 DSCP 标记（仅 tproxy UDP 入站）',
    payloadLabel: 'DSCP 标记',
    placeholder: '4'
  },
  {
    type: 'RULE-SET',
    description: '引用 rule-providers 中的规则集合',
    payloadLabel: '规则集合名称',
    placeholder: 'provider-name',
    supportsIpOptions: true
  },
  {
    type: 'AND',
    description: '所有子条件均匹配',
    payloadLabel: '逻辑表达式',
    placeholder: '((DOMAIN,example.com),(NETWORK,TCP))'
  },
  {
    type: 'OR',
    description: '任一子条件匹配',
    payloadLabel: '逻辑表达式',
    placeholder: '((NETWORK,UDP),(DOMAIN,example.com))'
  },
  {
    type: 'NOT',
    description: '子条件不匹配',
    payloadLabel: '逻辑表达式',
    placeholder: '((DOMAIN,example.com))'
  },
  {
    type: 'SUB-RULE',
    description: '满足条件后进入指定子规则',
    payloadLabel: '匹配条件',
    placeholder: '(NETWORK,TCP)'
  },
  {
    type: 'MATCH',
    description: '匹配所有请求，无需匹配内容',
    payloadLabel: '',
    placeholder: ''
  }
]

const IP_OPTION_TYPES = new Set(
  MIHOMO_RULE_TYPES.filter((item) => item.supportsIpOptions).map((item) => item.type)
)

export function getMihomoRuleType(type: string): MihomoRuleTypeOption {
  return (
    MIHOMO_RULE_TYPES.find((item) => item.type === type) ?? {
      type,
      description: '自定义规则类型',
      payloadLabel: '匹配内容',
      placeholder: ''
    }
  )
}

export function supportsMihomoRuleIpOptions(type: string): boolean {
  return IP_OPTION_TYPES.has(type)
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

export function parseMihomoRule(rule: string): MihomoRuleDraft {
  const parts = splitRule(rule)
  const type = (parts.shift() || 'DOMAIN').toUpperCase()
  let noResolve = false
  let sourceIp = false

  while (parts.length > 0) {
    const option = parts[parts.length - 1]?.toLowerCase()
    if (option === 'no-resolve') {
      noResolve = true
      parts.pop()
    } else if (option === 'src') {
      sourceIp = true
      parts.pop()
    } else {
      break
    }
  }

  const target = parts.pop() || ''
  return {
    type,
    payload: type === 'MATCH' ? '' : parts.join(','),
    target,
    noResolve,
    sourceIp
  }
}

export function stringifyMihomoRule(draft: MihomoRuleDraft): string {
  const type = draft.type.trim().toUpperCase()
  const parts = [type]

  if (type !== 'MATCH') parts.push(draft.payload.trim())
  parts.push(draft.target.trim())

  if (supportsMihomoRuleIpOptions(type)) {
    if (draft.noResolve) parts.push('no-resolve')
    if (draft.sourceIp) parts.push('src')
  }

  return parts.join(',')
}

export function validateMihomoRuleDraft(draft: MihomoRuleDraft): string | null {
  const type = draft.type.trim().toUpperCase()
  if (!type) return '请选择规则类型'
  if (type !== 'MATCH' && !draft.payload.trim()) return '请填写匹配内容'
  if (!draft.target.trim()) return type === 'SUB-RULE' ? '请填写子规则名称' : '请填写策略或代理'
  if (draft.target.includes(',')) return '策略、代理或子规则名称不能包含逗号'

  if ((type === 'AND' || type === 'OR' || type === 'NOT') && !/^\(\(.+\)\)$/.test(draft.payload.trim())) {
    return '逻辑规则需要使用双层括号，例如 ((DOMAIN,example.com),(NETWORK,TCP))'
  }
  if (type === 'SUB-RULE' && !/^\(.+\)$/.test(draft.payload.trim())) {
    return '子规则条件需要使用括号，例如 (NETWORK,TCP)'
  }

  return null
}
