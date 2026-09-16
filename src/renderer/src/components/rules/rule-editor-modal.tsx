import {
  Button,
  Label,
  ListBox,
  Modal,
  Select,
  Separator,
  Surface,
  Switch,
  TextArea
} from '@heroui-v3/react'
import React, { useMemo, useState, type ReactNode } from 'react'
import {
  getMihomoRuleType,
  MIHOMO_RULE_TYPES,
  parseMihomoRule,
  stringifyMihomoRule,
  supportsMihomoRuleIpOptions,
  validateMihomoRuleDraft,
  type MihomoRuleDraft,
  type MihomoRuleTypeOption
} from '@renderer/utils/mihomo-rule'

interface Props {
  mode: 'add' | 'edit'
  initialRule?: string
  isSaving?: boolean
  targetOptions: string[]
  subRuleOptions: string[]
  onClose: () => void
  onSave: (rule: string) => void | Promise<void>
}

const DEFAULT_RULE: MihomoRuleDraft = {
  type: 'DOMAIN',
  payload: '',
  target: 'DIRECT',
  noResolve: false,
  sourceIp: false
}

const RuleEditorModal: React.FC<Props> = (props) => {
  const {
    mode,
    initialRule,
    isSaving,
    targetOptions,
    subRuleOptions,
    onClose,
    onSave
  } = props
  const [draft, setDraft] = useState<MihomoRuleDraft>(() =>
    initialRule ? parseMihomoRule(initialRule) : DEFAULT_RULE
  )
  const [error, setError] = useState<string | null>(null)
  const typeInfo = getMihomoRuleType(draft.type)
  const supportsIpOptions = supportsMihomoRuleIpOptions(draft.type)
  const usesMultilinePayload =
    draft.type === 'AND' || draft.type === 'OR' || draft.type === 'NOT'
  const typeOptions = useMemo<MihomoRuleTypeOption[]>(() => {
    if (MIHOMO_RULE_TYPES.some((item) => item.type === draft.type)) return MIHOMO_RULE_TYPES
    return [getMihomoRuleType(draft.type), ...MIHOMO_RULE_TYPES]
  }, [draft.type])
  const selectableTargets = useMemo(() => {
    const options = draft.type === 'SUB-RULE' ? subRuleOptions : targetOptions
    return draft.target && !options.includes(draft.target) ? [draft.target, ...options] : options
  }, [draft.target, draft.type, subRuleOptions, targetOptions])
  const generatedRule = stringifyMihomoRule(draft)

  const updateDraft = (patch: Partial<MihomoRuleDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }))
    setError(null)
  }

  const handleSave = async (): Promise<void> => {
    const validationError = validateMihomoRuleDraft(draft)
    if (validationError) {
      setError(validationError)
      return
    }
    await onSave(generatedRule)
  }

  const renderField = (
    title: string,
    content: ReactNode,
    options?: { align?: 'start' | 'center'; divider?: boolean }
  ): ReactNode => {
    const { align = 'center', divider = true } = options || {}

    return (
      <Surface key={title} variant="transparent" className="flex flex-col">
        <div
          className={`setting-item px-0 setting-item--content-end ${
            align === 'start' ? 'setting-item--start' : 'setting-item--center'
          }`}
          style={{ gridTemplateColumns: '124px minmax(0, 1fr)' }}
        >
          <div className="setting-item__title-wrap">
            <Label className="setting-item__title">{title}</Label>
          </div>
          <div className="setting-item__content w-full">{content}</div>
        </div>
        {divider ? <Separator variant="tertiary" className="bg-default-100/70" /> : null}
      </Surface>
    )
  }

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={true}
        onOpenChange={(open) => {
          if (!open && !isSaving) onClose()
        }}
        variant="blur"
        className="top-12 h-[calc(100%-48px)]"
      >
        <Modal.Container scroll="inside">
          <Modal.Dialog className="w-[min(560px,calc(100%-24px))] max-w-none">
            <Modal.Header className="app-drag pb-1">
              <Modal.Heading>{mode === 'add' ? '添加规则' : '编辑规则'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="no-scrollbar max-h-[72vh] overflow-y-auto pt-1 pb-2">
              <Surface variant="transparent" className="flex flex-col">
                {renderField(
                  '规则类型',
                  <Select
                    aria-label="规则类型"
                    fullWidth
                    className="w-full"
                    style={{ width: '100%' }}
                    value={draft.type}
                    variant="secondary"
                    onChange={(value) => {
                      if (Array.isArray(value) || value == null) return
                      const type = String(value)
                      const isSubRule = type === 'SUB-RULE'
                      const wasSubRule = draft.type === 'SUB-RULE'
                      updateDraft({
                        type,
                        target: isSubRule
                          ? subRuleOptions[0] || ''
                          : wasSubRule
                            ? targetOptions[0] || 'DIRECT'
                            : draft.target,
                        noResolve: supportsMihomoRuleIpOptions(type) ? draft.noResolve : false,
                        sourceIp: supportsMihomoRuleIpOptions(type) ? draft.sourceIp : false
                      })
                    }}
                  >
                    <Select.Trigger
                      className="h-9 min-h-9 w-full items-center py-0"
                      style={{ width: '100%' }}
                    >
                      <Select.Value className="flex h-full items-center">
                        {({ selectedText }) => selectedText}
                      </Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="max-h-80">
                      <ListBox>
                        {typeOptions.map((item) => (
                          <ListBox.Item key={item.type} id={item.type} textValue={item.type}>
                            <div className="min-w-0 py-0.5">
                              <div className="font-medium">{item.type}</div>
                              <div className="truncate text-xs text-foreground-500">
                                {item.description}
                              </div>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                {draft.type !== 'MATCH' &&
                  renderField(
                    typeInfo.payloadLabel || '匹配内容',
                    <TextArea
                      aria-label={typeInfo.payloadLabel || '匹配内容'}
                      rows={usesMultilinePayload ? 3 : 1}
                      fullWidth
                      value={draft.payload}
                      placeholder={typeInfo.placeholder}
                      variant="secondary"
                      className="w-full resize-y"
                      style={{ width: '100%', minHeight: '36px' }}
                      onChange={(event) => updateDraft({ payload: event.target.value })}
                    />,
                    { align: usesMultilinePayload ? 'start' : 'center' }
                  )}

                {renderField(
                  draft.type === 'SUB-RULE' ? '子规则名称' : '策略 / 代理',
                  <div className="w-full">
                    <Select
                      aria-label={draft.type === 'SUB-RULE' ? '子规则名称' : '策略或代理'}
                      fullWidth
                      className="w-full"
                      style={{ width: '100%' }}
                      value={draft.target || null}
                      variant="secondary"
                      isDisabled={selectableTargets.length === 0}
                      onChange={(value) => {
                        if (Array.isArray(value) || value == null) return
                        updateDraft({ target: String(value) })
                      }}
                    >
                      <Select.Trigger
                        className="h-9 min-h-9 w-full items-center py-0"
                        style={{ width: '100%' }}
                      >
                        <Select.Value className="flex h-full items-center" />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="max-h-80">
                        <ListBox>
                          {selectableTargets.map((target) => (
                            <ListBox.Item key={target} id={target} textValue={target}>
                              {target}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {draft.type === 'SUB-RULE' && selectableTargets.length === 0 && (
                      <p className="mt-1 text-xs text-warning">当前配置没有可用的子规则</p>
                    )}
                  </div>,
                  { divider: true }
                )}

                {renderField(
                  '跳过 DNS 解析',
                  <Switch
                    aria-label="跳过 DNS 解析"
                    size="sm"
                    isDisabled={!supportsIpOptions}
                    isSelected={draft.noResolve}
                    onChange={(selected) => updateDraft({ noResolve: selected })}
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>,
                  { divider: supportsIpOptions }
                )}

                {supportsIpOptions &&
                  renderField(
                    '匹配来源 IP',
                    <Switch
                      aria-label="匹配来源 IP"
                      size="sm"
                      isSelected={draft.sourceIp}
                      onChange={(selected) => updateDraft({ sourceIp: selected })}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>,
                    { divider: false }
                  )}
              </Surface>

              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </Modal.Body>
            <Modal.Footer className="justify-end pt-2">
              <Button size="sm" variant="secondary" isDisabled={isSaving} onPress={onClose}>
                取消
              </Button>
              <Button size="sm" variant="primary" isPending={isSaving} onPress={handleSave}>
                {mode === 'add' ? '添加' : '保存'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export default RuleEditorModal
