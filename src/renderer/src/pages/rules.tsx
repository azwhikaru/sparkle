import BasePage from '@renderer/components/base/base-page'
import ConfirmModal from '@renderer/components/base/base-confirm'
import RuleEditorModal from '@renderer/components/rules/rule-editor-modal'
import RuleItem from '@renderer/components/rules/rule-item'
import { Virtuoso } from 'react-virtuoso'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Divider, Input, Tooltip } from '@heroui/react'
import { useRules } from '@renderer/hooks/use-rules'
import { includesIgnoreCase } from '@renderer/utils/includes'
import {
  getRuntimeConfig,
  getCurrentProfileRules,
  mihomoProxies,
  setCurrentProfileRules,
  restartCore
} from '@renderer/utils/ipc'
import { notify } from '@renderer/utils/notification'
import { parseMihomoRule } from '@renderer/utils/mihomo-rule'
import { LuPlus } from 'react-icons/lu'

interface EditorState {
  mode: 'add' | 'edit'
  index?: number
  initialRule?: string
}

function createRuleDetail(sourceRule: string, index: number): ControllerRulesDetail {
  const rule = parseMihomoRule(sourceRule)
  return {
    index,
    type: rule.type,
    payload: rule.payload,
    proxy: rule.target,
    size: -1,
    extra: {
      disabled: false,
      hitCount: 0,
      hitAt: '',
      missCount: 0,
      missAt: ''
    }
  }
}

const Rules: React.FC = () => {
  const { rules, mutate } = useRules()
  const [filter, setFilter] = useState('')
  const [sourceRules, setSourceRules] = useState<string[]>([])
  const [sourceRulesLoaded, setSourceRulesLoaded] = useState(false)
  const [targetOptions, setTargetOptions] = useState<string[]>([])
  const [subRuleOptions, setSubRuleOptions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const loadSourceRules = useCallback(async (): Promise<void> => {
    setSourceRulesLoaded(false)
    try {
      const [config, profileRules] = await Promise.all([
        getRuntimeConfig(),
        getCurrentProfileRules()
      ])
      setSourceRules(profileRules)
      setSubRuleOptions(Object.keys(config['sub-rules'] ?? {}).sort((a, b) => a.localeCompare(b)))

      const configuredTargets = [
        ...(config['proxy-groups'] ?? []).map((group) => group.name),
        ...(config.proxies ?? []).map((proxy) => proxy.name)
      ]
      let controllerTargets: string[] = []
      try {
        const proxies = await mihomoProxies()
        controllerTargets = Object.keys(proxies.proxies)
      } catch {
        // The runtime config still provides usable targets while the controller is reconnecting.
      }
      const specialTargets = ['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS']
      const allTargets = [...new Set([...specialTargets, ...controllerTargets, ...configuredTargets])]
        .filter(
          (target) =>
            !/^前置代理(?:_\d+)?$/.test(target) &&
            !/^__SPARKLE_PRE_PROXY(?:_DIRECT)?__(?:_\d+)?$/.test(target) &&
            !/^__SPARKLE_POST_PROXY__(?:_\d+)?$/.test(target)
        )
      setTargetOptions([
        ...specialTargets.filter((target) => allTargets.includes(target)),
        ...allTargets
          .filter((target) => !specialTargets.includes(target))
          .sort((a, b) => a.localeCompare(b))
      ])
      setSourceRulesLoaded(true)
    } catch (error) {
      notify(error, { variant: 'danger' })
    }
  }, [])

  useEffect(() => {
    void loadSourceRules()
    const unsubscribeCoreStarted = window.electron.ipcRenderer.on('core-started', () => {
      void loadSourceRules()
    })
    return (): void => unsubscribeCoreStarted()
  }, [loadSourceRules])

  const persistRules = useCallback(
    async (nextRules: string[]): Promise<boolean> => {
      setIsSaving(true)
      try {
        await setCurrentProfileRules(nextRules)
        await restartCore()
        setSourceRules(nextRules)
        mutate()
        return true
      } catch (error) {
        notify(error, { variant: 'danger' })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [mutate]
  )

  const filteredRules = useMemo(() => {
    const ruleDetails = new Map(rules?.rules.map((rule) => [rule.index, rule]) ?? [])
    return sourceRules
      .map((sourceRule, sourceIndex) => {
        const rule = ruleDetails.get(sourceIndex) ?? createRuleDetail(sourceRule, sourceIndex)
        return { rule, sourceIndex, sourceRule }
      })
      .filter(({ rule, sourceRule }) => {
        if (!filter) return true
        return (
          includesIgnoreCase(sourceRule, filter) ||
          includesIgnoreCase(rule.payload, filter) ||
          includesIgnoreCase(rule.type, filter) ||
          includesIgnoreCase(rule.proxy, filter)
        )
      })
  }, [filter, rules, sourceRules])

  const moveRule = (index: number, target: 'up' | 'down' | 'top' | 'bottom'): void => {
    const nextRules = [...sourceRules]
    const [rule] = nextRules.splice(index, 1)
    const targetIndex =
      target === 'top'
        ? 0
        : target === 'bottom'
          ? nextRules.length
          : target === 'up'
            ? index - 1
            : index + 1
    nextRules.splice(targetIndex, 0, rule)
    void persistRules(nextRules)
  }

  const saveEditorRule = async (rule: string): Promise<void> => {
    if (!editor) return
    const nextRules = [...sourceRules]

    if (editor.mode === 'edit' && editor.index !== undefined) {
      nextRules[editor.index] = rule
    } else {
      const matchIndex = nextRules.findIndex(
        (sourceRule) => parseMihomoRule(sourceRule).type === 'MATCH'
      )
      nextRules.splice(matchIndex === -1 ? nextRules.length : matchIndex, 0, rule)
    }

    if (await persistRules(nextRules)) setEditor(null)
  }

  return (
    <BasePage title="分流规则">
      <div className="sticky top-0 z-40">
        <div className="flex gap-2 p-2">
          <Input
            size="sm"
            value={filter}
            placeholder="筛选过滤"
            isClearable
            onValueChange={setFilter}
          />
          <Tooltip content="添加规则">
            <Button
              isIconOnly
              size="sm"
              color="primary"
              aria-label="添加规则"
              isDisabled={isSaving || !sourceRulesLoaded}
              onPress={() => setEditor({ mode: 'add' })}
            >
              <LuPlus className="text-xl" />
            </Button>
          </Tooltip>
        </div>
        <Divider />
      </div>
      <div className="h-[calc(100vh-100px)] mt-px">
        <Virtuoso
          data={filteredRules}
          itemContent={(index, item) => (
            <RuleItem
              index={index}
              sourceIndex={item.sourceIndex}
              sourceRule={item.sourceRule}
              rule={item.rule}
              total={sourceRules.length}
              isBusy={isSaving}
              onEdit={(sourceIndex) =>
                setEditor({
                  mode: 'edit',
                  index: sourceIndex,
                  initialRule: sourceRules[sourceIndex]
                })
              }
              onMove={moveRule}
              onDelete={setDeleteIndex}
            />
          )}
        />
      </div>
      {editor && (
        <RuleEditorModal
          mode={editor.mode}
          initialRule={editor.initialRule}
          isSaving={isSaving}
          targetOptions={targetOptions}
          subRuleOptions={subRuleOptions}
          onClose={() => setEditor(null)}
          onSave={saveEditorRule}
        />
      )}
      {deleteIndex !== null && (
        <ConfirmModal
          onChange={(open) => {
            if (!open) setDeleteIndex(null)
          }}
          title="确认删除规则？"
          description={sourceRules[deleteIndex]}
          confirmText="删除"
          onConfirm={async () => {
            await persistRules(
              sourceRules.filter((_, sourceIndex) => sourceIndex !== deleteIndex)
            )
          }}
        />
      )}
    </BasePage>
  )
}

export default Rules
