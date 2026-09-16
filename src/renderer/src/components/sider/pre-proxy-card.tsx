import { Button, Card, CardBody, CardFooter, Tooltip } from '@heroui/react'
import BorderSwitch from '@renderer/components/base/border-swtich'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { restartCore } from '@renderer/utils/ipc'
import { notify } from '@renderer/utils/notification'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React, { useState } from 'react'
import { LuWaypoints } from 'react-icons/lu'
import { useLocation, useNavigate } from 'react-router-dom'

interface Props {
  iconOnly?: boolean
}

const PreProxyCard: React.FC<Props> = ({ iconOnly = false }) => {
  const { appConfig, patchAppConfig } = useAppConfig()
  const {
    preProxy = {
      enable: false,
      node: { type: 'socks5', server: '127.0.0.1', port: 1080, udp: true }
    },
    preProxyCardStatus = 'col-span-2',
    disableAnimation = false
  } = appConfig || {}
  const [changing, setChanging] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const match = location.pathname.includes('/preproxy')
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: sortableTransform,
    transition,
    isDragging
  } = useSortable({ id: 'preproxy' })
  const transform = sortableTransform
    ? { x: sortableTransform.x, y: sortableTransform.y, scaleX: 1, scaleY: 1 }
    : null

  const onChange = async (enable: boolean): Promise<void> => {
    setChanging(true)
    try {
      const nextConfig = await patchAppConfig({ preProxy: { ...preProxy, enable } })
      if (!nextConfig) return
      await restartCore()
    } catch (error) {
      notify(error, { variant: 'danger' })
    } finally {
      setChanging(false)
    }
  }

  if (iconOnly) {
    return (
      <div className={`${preProxyCardStatus} flex justify-center`}>
        <Tooltip content="前置代理" placement="right">
          <Button
            size="sm"
            isIconOnly
            color={match ? 'primary' : 'default'}
            variant={match ? 'solid' : 'light'}
            onPress={() => navigate('/preproxy')}
          >
            <LuWaypoints className="text-[20px]" />
          </Button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 'calc(infinity)' : undefined
      }}
      className={`${preProxyCardStatus} preproxy-card`}
    >
      <Card
        fullWidth
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`${match ? 'bg-primary' : 'hover:bg-primary/30'} ${isDragging ? `${disableAnimation ? '' : 'scale-[0.95]'} tap-highlight-transparent` : ''}`}
      >
        {preProxyCardStatus === 'col-span-2' ? (
          <CardBody className="py-2 px-0 overflow-y-visible">
            <div className="flex justify-between items-center h-8">
              <Button
                isIconOnly
                className="bg-transparent pointer-events-none"
                variant="flat"
                color="default"
              >
                <LuWaypoints
                  className={`${match ? 'text-primary-foreground' : 'text-foreground'} text-[24px] font-bold`}
                />
              </Button>
              <h3
                className={`mr-auto text-md font-bold ${match ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                前置代理
              </h3>
              <BorderSwitch
                isShowBorder={match && preProxy.enable}
                isSelected={preProxy.enable}
                isDisabled={changing || !appConfig}
                onValueChange={onChange}
              />
            </div>
          </CardBody>
        ) : (
          <>
            <CardBody className="pb-1 pt-0 px-0 overflow-y-visible">
              <div className="flex justify-between">
                <Button
                  isIconOnly
                  className="bg-transparent pointer-events-none"
                  variant="flat"
                  color="default"
                >
                  <LuWaypoints
                    className={`${match ? 'text-primary-foreground' : 'text-foreground'} text-[24px] font-bold`}
                  />
                </Button>
                <BorderSwitch
                  isShowBorder={match && preProxy.enable}
                  isSelected={preProxy.enable}
                  isDisabled={changing || !appConfig}
                  onValueChange={onChange}
                />
              </div>
            </CardBody>
            <CardFooter className="pt-1">
              <h3
                className={`text-md font-bold ${match ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                前置代理
              </h3>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}

export default PreProxyCard
