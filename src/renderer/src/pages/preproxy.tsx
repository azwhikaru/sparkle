import { Button, Select, SelectItem } from '@heroui/react'
import BasePage from '@renderer/components/base/base-page'
import { BaseEditor } from '@renderer/components/base/base-editor-lazy'
import SettingCard from '@renderer/components/base/base-setting-card'
import SettingItem from '@renderer/components/base/base-setting-item'
import { PRE_PROXY_TEMPLATES } from '@renderer/components/preproxy/pre-proxy-templates'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { restartCore } from '@renderer/utils/ipc'
import { notify } from '@renderer/utils/notification'
import { dump, load } from 'js-yaml'
import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_NODE: Record<string, unknown> = {
  type: 'socks5',
  server: '127.0.0.1',
  port: 1080,
  udp: true
}

function stringifyNode(node: Record<string, unknown>): string {
  return dump(node, { noRefs: true, lineWidth: -1 })
}

function parseNode(source: string): Record<string, unknown> {
  const parsed = load(source)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('配置必须是一个 YAML 对象')
  }
  const node = { ...(parsed as Record<string, unknown>) }
  if (typeof node.type !== 'string' || node.type.trim() === '') {
    throw new Error('必须填写 Mihomo 代理类型 type')
  }
  delete node.name
  delete node['dialer-proxy']
  return node
}

const PreProxy: React.FC = () => {
  const { appConfig, patchAppConfig } = useAppConfig()
  const initialized = useRef(false)
  const [source, setSource] = useState(stringifyNode(DEFAULT_NODE))
  const [changed, setChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const preProxy = appConfig?.preProxy ?? { enable: false, node: DEFAULT_NODE }

  useEffect(() => {
    if (!appConfig || initialized.current) return
    initialized.current = true
    setSource(stringifyNode(preProxy.node ?? DEFAULT_NODE))
  }, [appConfig, preProxy.node])

  const saveNode = async (): Promise<void> => {
    setSaving(true)
    try {
      const node = parseNode(source)
      const nextConfig = await patchAppConfig({ preProxy: { ...preProxy, node } })
      if (!nextConfig) return
      setSource(stringifyNode(node))
      setChanged(false)
      if (preProxy.enable) await restartCore()
      notify('前置代理配置已保存', { variant: 'success' })
    } catch (error) {
      notify(error, { variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <BasePage
      title="前置代理设置"
      contentClassName="no-scrollbar"
      header={
        changed && (
          <Button
            size="sm"
            className="app-nodrag"
            color="primary"
            isLoading={saving}
            onPress={saveNode}
          >
            保存
          </Button>
        )
      }
    >
      <SettingCard>
        <SettingItem compatKey="legacy" title="配置模板">
          <Select
            aria-label="配置模板"
            placeholder="选择协议"
            className="w-50"
            size="sm"
            onSelectionChange={(selection) => {
              const key = selection.currentKey as string | undefined
              const template = PRE_PROXY_TEMPLATES.find((item) => item.key === key)
              if (!template) return
              setSource(stringifyNode(template.node))
              setChanged(true)
            }}
          >
            {PRE_PROXY_TEMPLATES.map((template) => (
              <SelectItem key={template.key}>{template.label}</SelectItem>
            ))}
          </Select>
        </SettingItem>
      </SettingCard>
      <SettingCard>
        <h3 className="select-text text-md font-semibold mb-2">代理节点配置</h3>
        <p className="select-text text-sm text-default-500 mb-3">
          填写一个被内核接受的出站代理节点，或者使用模板
        </p>
        <div className="h-[calc(100vh-270px)] min-h-75">
          <BaseEditor
            language="yaml"
            value={source}
            onChange={(value) => {
              setSource(value)
              setChanged(true)
            }}
          />
        </div>
      </SettingCard>
    </BasePage>
  )
}

export default PreProxy
