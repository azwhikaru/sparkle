import { Button, Card, Chip, Switch, Tooltip } from '@heroui/react'
import { Pressable } from 'react-aria'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { mihomoRulesDisable } from '@renderer/utils/ipc'
import RuleDetailTooltip from './rule-detail-tooltip'
import { parseMihomoRule } from '@renderer/utils/mihomo-rule'
import { LuArrowDown, LuArrowUp, LuChevronsDown, LuChevronsUp, LuTrash2 } from 'react-icons/lu'

import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import dayjs from 'dayjs'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface Props {
  index: number
  sourceIndex: number
  sourceRule: string
  rule: ControllerRulesDetail
  total: number
  isBusy?: boolean
  onEdit: (index: number) => void
  onMove: (index: number, target: 'up' | 'down' | 'top' | 'bottom') => void
  onDelete: (index: number) => void
}

const RuleItem: React.FC<Props> = ({
  rule,
  index,
  sourceIndex,
  sourceRule,
  total,
  isBusy,
  onEdit,
  onMove,
  onDelete
}) => {
  const [isEnabled, setIsEnabled] = useState(!rule.extra.disabled)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const { hitCount, missCount } = rule.extra

  const totalCount = hitCount + missCount
  const hitRate = totalCount > 0 ? (hitCount / totalCount) * 100 : 0

  const hasStats = totalCount > 0
  const parsedRule = parseMihomoRule(sourceRule)

  useEffect(() => {
    setIsEnabled(!rule.extra.disabled)
  }, [rule, rule.extra.disabled])

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 600)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setShowTooltip(false)
  }, [])

  useEffect(() => {
    if (!showTooltip) return
    const handleMouseMove = (e: MouseEvent): void => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [showTooltip])

  const handleToggle = async (v: boolean): Promise<void> => {
    setIsEnabled(v)
    try {
      await mihomoRulesDisable({ [rule.index]: !v })
    } catch {
      setIsEnabled(!v)
    }
  }

  return (
    <div className={`w-full px-2 pb-2 ${index === 0 ? 'pt-2' : ''}`}>
      <Pressable onPress={() => onEdit(sourceIndex)} isDisabled={isBusy}>
        <Card
          className="w-full"
          data-pressable="true"
          role="button"
          tabIndex={0}
          aria-label="编辑规则"
        >
          <Card.Content className="w-full">
            <div className="flex items-center justify-between gap-2">
              <div
                title={parsedRule.payload || 'MATCH'}
                className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left"
              >
                {parsedRule.payload || 'MATCH'}
              </div>
              <div
                className="flex shrink-0 items-center"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="置顶"
                    isDisabled={isBusy || sourceIndex === 0}
                    onPress={() => onMove(sourceIndex, 'top')}
                  >
                    <LuChevronsUp className="text-lg" />
                  </Button>
                  <Tooltip.Content>置顶</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="上移"
                    isDisabled={isBusy || sourceIndex === 0}
                    onPress={() => onMove(sourceIndex, 'up')}
                  >
                    <LuArrowUp className="text-lg" />
                  </Button>
                  <Tooltip.Content>上移</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="下移"
                    isDisabled={isBusy || sourceIndex === total - 1}
                    onPress={() => onMove(sourceIndex, 'down')}
                  >
                    <LuArrowDown className="text-lg" />
                  </Button>
                  <Tooltip.Content>下移</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="置底"
                    isDisabled={isBusy || sourceIndex === total - 1}
                    onPress={() => onMove(sourceIndex, 'bottom')}
                  >
                    <LuChevronsDown className="text-lg" />
                  </Button>
                  <Tooltip.Content>置底</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0}>
                  <Button
                    isIconOnly
                    size="sm"
                    data-color="danger"
                    variant="ghost"
                    aria-label="删除"
                    isDisabled={isBusy}
                    onPress={() => onDelete(sourceIndex)}
                  >
                    <LuTrash2 className="text-lg" />
                  </Button>
                  <Tooltip.Content>删除</Tooltip.Content>
                </Tooltip>
                <Switch
                  className="ml-1"
                  size="sm"
                  isDisabled={isBusy}
                  isSelected={isEnabled}
                  aria-label="启用规则"
                  onChange={handleToggle}
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <div className="flex justify-start text-foreground-500">
                <div>{parsedRule.type}</div>
                <div className="ml-2">{parsedRule.target}</div>
                {parsedRule.noResolve && <div className="ml-2">no-resolve</div>}
                {parsedRule.sourceIp && <div className="ml-2">src</div>}
              </div>
              {hasStats && (
                <div
                  ref={wrapperRef}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <Chip
                    size="sm"
                    data-color="primary"
                    variant="soft"
                    className={['text-xs'].filter(Boolean).join(' ')}
                  >
                    <Chip.Label>{hitRate.toFixed(1)}%</Chip.Label>
                  </Chip>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
      </Pressable>
      <RuleDetailTooltip
        rule={rule}
        anchorEl={showTooltip ? wrapperRef.current : null}
        visible={showTooltip}
      />
    </div>
  )
}

export default RuleItem
