export interface PreProxyTemplate {
  key: string
  label: string
  node: Record<string, unknown>
}

export const PRE_PROXY_TEMPLATES: PreProxyTemplate[] = [
  {
    key: 'http',
    label: 'HTTP',
    node: {
      type: 'http',
      server: '127.0.0.1',
      port: 8080,
      username: '',
      password: '',
      tls: false
    }
  },
  {
    key: 'socks5',
    label: 'SOCKS5',
    node: {
      type: 'socks5',
      server: '127.0.0.1',
      port: 1080,
      username: '',
      password: '',
      udp: true
    }
  },
  {
    key: 'ss',
    label: 'Shadowsocks',
    node: {
      type: 'ss',
      server: 'example.com',
      port: 443,
      cipher: 'chacha20-ietf-poly1305',
      password: '',
      udp: true
    }
  },
  {
    key: 'ssr',
    label: 'ShadowsocksR',
    node: {
      type: 'ssr',
      server: 'example.com',
      port: 443,
      cipher: 'aes-256-cfb',
      password: '',
      obfs: 'plain',
      protocol: 'origin',
      udp: true
    }
  },
  {
    key: 'snell',
    label: 'Snell',
    node: {
      type: 'snell',
      server: 'example.com',
      port: 443,
      psk: '',
      version: 3,
      udp: true
    }
  },
  {
    key: 'vmess',
    label: 'VMess',
    node: {
      type: 'vmess',
      server: 'example.com',
      port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      alterId: 0,
      cipher: 'auto',
      network: 'tcp',
      udp: true
    }
  },
  {
    key: 'vless',
    label: 'VLESS',
    node: {
      type: 'vless',
      server: 'example.com',
      port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      network: 'tcp',
      tls: true,
      servername: 'example.com',
      udp: true
    }
  },
  {
    key: 'trojan',
    label: 'Trojan',
    node: {
      type: 'trojan',
      server: 'example.com',
      port: 443,
      password: '',
      sni: 'example.com',
      'skip-cert-verify': false,
      udp: true
    }
  },
  {
    key: 'anytls',
    label: 'AnyTLS',
    node: {
      type: 'anytls',
      server: 'example.com',
      port: 443,
      password: '',
      sni: 'example.com',
      'skip-cert-verify': false,
      udp: true
    }
  },
  {
    key: 'mieru',
    label: 'Mieru',
    node: {
      type: 'mieru',
      server: 'example.com',
      port: 443,
      transport: 'TCP',
      username: '',
      password: '',
      multiplexing: 'MULTIPLEXING_LOW'
    }
  },
  {
    key: 'sudoku',
    label: 'Sudoku',
    node: {
      type: 'sudoku',
      server: 'example.com',
      port: 443,
      key: '',
      'aead-method': 'chacha20-poly1305'
    }
  },
  {
    key: 'hysteria',
    label: 'Hysteria',
    node: {
      type: 'hysteria',
      server: 'example.com',
      port: 443,
      'auth-str': '',
      up: '20 Mbps',
      down: '100 Mbps',
      sni: 'example.com',
      'skip-cert-verify': false
    }
  },
  {
    key: 'hysteria2',
    label: 'Hysteria2',
    node: {
      type: 'hysteria2',
      server: 'example.com',
      port: 443,
      password: '',
      sni: 'example.com',
      'skip-cert-verify': false
    }
  },
  {
    key: 'tuic',
    label: 'TUIC',
    node: {
      type: 'tuic',
      server: 'example.com',
      port: 443,
      uuid: '00000000-0000-0000-0000-000000000000',
      password: '',
      sni: 'example.com',
      'congestion-controller': 'bbr',
      'udp-relay-mode': 'native',
      'skip-cert-verify': false
    }
  },
  {
    key: 'shadowquic',
    label: 'ShadowQUIC',
    node: {
      type: 'shadowquic',
      server: 'example.com',
      port: 443,
      username: '',
      password: '',
      sni: 'example.com',
      alpn: ['h3']
    }
  },
  {
    key: 'wireguard',
    label: 'WireGuard',
    node: {
      type: 'wireguard',
      ip: '10.0.0.2',
      'private-key': '',
      udp: true,
      peers: [
        {
          server: 'example.com',
          port: 51820,
          'public-key': '',
          'allowed-ips': ['0.0.0.0/0', '::/0']
        }
      ]
    }
  },
  {
    key: 'ssh',
    label: 'SSH',
    node: {
      type: 'ssh',
      server: 'example.com',
      port: 22,
      username: '',
      password: ''
    }
  },
  {
    key: 'masque',
    label: 'MASQUE',
    node: {
      type: 'masque',
      server: 'example.com',
      port: 443,
      network: 'h3-l4proxy',
      ip: '10.0.0.2',
      ipv6: 'fd00::2',
      'private-key': '',
      'public-key': '',
      sni: 'example.com'
    }
  },
  {
    key: 'trusttunnel',
    label: 'TrustTunnel',
    node: {
      type: 'trusttunnel',
      server: 'example.com',
      port: 443,
      username: '',
      password: '',
      sni: 'example.com',
      udp: true
    }
  },
  {
    key: 'openvpn',
    label: 'OpenVPN',
    node: {
      type: 'openvpn',
      server: 'example.com',
      port: 1194,
      proto: 'udp',
      ca: '',
      username: '',
      password: '',
      udp: true
    }
  },
  {
    key: 'tailscale',
    label: 'Tailscale',
    node: {
      type: 'tailscale',
      hostname: 'mihomo',
      'auth-key': '',
      'accept-routes': true,
      udp: true
    }
  },
  {
    key: 'zerotier',
    label: 'ZeroTier',
    node: {
      type: 'zerotier',
      network: '',
      udp: true
    }
  },
  {
    key: 'gost-relay',
    label: 'GOST Relay',
    node: {
      type: 'gost-relay',
      server: 'example.com',
      port: 443,
      username: '',
      password: '',
      tls: true,
      udp: true
    }
  },
  {
    key: 'easytier',
    label: 'EasyTier',
    node: {
      type: 'easytier',
      'network-name': 'example',
      'network-secret': '',
      peers: ['tcp://example.com:11010'],
      udp: true
    }
  }
]
