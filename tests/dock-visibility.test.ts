import assert from 'node:assert/strict'
import test from 'node:test'
import { createDockVisibilityController } from '../src/main/resolve/dockVisibility'

function createFixture(initiallyVisible = true) {
  let visible = initiallyVisible
  let hideCount = 0
  let showCount = 0
  let completeShow: (() => void) | undefined
  let failShow: ((error: Error) => void) | undefined
  const errors: unknown[] = []
  const dock = {
    hide(): void {
      visible = false
      hideCount++
    },
    show(): Promise<void> {
      showCount++
      return new Promise((resolve, reject) => {
        completeShow = () => {
          visible = true
          resolve()
        }
        failShow = reject
      })
    },
    isVisible: () => visible
  }
  const controller = createDockVisibilityController(dock, (error) => errors.push(error))
  return {
    controller,
    dock,
    errors,
    completeShow: () => completeShow!(),
    failShow: (error: Error) => failShow!(error),
    setNativeVisible(value: boolean): void {
      visible = value
    },
    get hideCount() {
      return hideCount
    },
    get showCount() {
      return showCount
    }
  }
}

test('silent startup hides the Dock even when its setting is enabled', () => {
  const fixture = createFixture()
  fixture.controller.setEnabled(true)
  assert.equal(fixture.dock.isVisible(), false)
  assert.equal(fixture.hideCount, 1)
})

test('closing or destroying the main window hides the Dock', () => {
  const fixture = createFixture()
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.dock.isVisible(), true)
  fixture.controller.setWindowVisible(false)
  assert.equal(fixture.dock.isVisible(), false)
})

test('reopening the main window restores its Dock icon', async () => {
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.showCount, 1)
  fixture.completeShow()
  await Promise.resolve()
  assert.equal(fixture.dock.isVisible(), true)
})

test('disabling the Dock setting keeps it hidden while the window opens', () => {
  const fixture = createFixture()
  fixture.controller.setEnabled(false)
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.dock.isVisible(), false)
  assert.equal(fixture.showCount, 0)
})

test('enabling the Dock setting in the background does not show an icon', () => {
  const fixture = createFixture(false)
  fixture.controller.setEnabled(false)
  fixture.controller.setEnabled(true)
  assert.equal(fixture.dock.isVisible(), false)
  assert.equal(fixture.showCount, 0)
})

test('enabling the Dock setting with an open window restores the icon', async () => {
  const fixture = createFixture(false)
  fixture.controller.setEnabled(false)
  fixture.controller.setWindowVisible(true)
  fixture.controller.setEnabled(true)
  fixture.completeShow()
  await Promise.resolve()
  assert.equal(fixture.dock.isVisible(), true)
})

test('a delayed Dock show cannot leave an icon after the window closes', async () => {
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  fixture.controller.setWindowVisible(false)
  fixture.completeShow()
  await Promise.resolve()
  assert.equal(fixture.dock.isVisible(), false)
})

test('an unresolved show does not prevent hiding or a later window reopening', () => {
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  fixture.controller.setWindowVisible(false)
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.showCount, 2)
})

test('a native show that appears late without resolving is hidden again', (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 })
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  fixture.controller.setWindowVisible(false)
  fixture.setNativeVisible(true)
  context.mock.timers.tick(1100)
  assert.equal(fixture.dock.isVisible(), false)
})

test('duplicate show and hide events do not repeat native calls', async () => {
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.showCount, 1)
  fixture.completeShow()
  await Promise.resolve()
  fixture.controller.setWindowVisible(true)
  assert.equal(fixture.showCount, 1)
  fixture.controller.setWindowVisible(false)
  fixture.controller.setWindowVisible(false)
  assert.equal(fixture.hideCount, 1)
})

test('rapid close/reopen/close respects macOS hide interval', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 })
  const fixture = createFixture()
  fixture.controller.setWindowVisible(false)
  context.mock.timers.tick(100)
  fixture.controller.setWindowVisible(true)
  fixture.completeShow()
  await Promise.resolve()
  fixture.controller.setWindowVisible(false)
  assert.equal(fixture.hideCount, 1)
  context.mock.timers.tick(999)
  assert.equal(fixture.hideCount, 1)
  context.mock.timers.tick(1)
  assert.equal(fixture.hideCount, 2)
  assert.equal(fixture.dock.isVisible(), false)
})

test('reopening before a deferred hide cancels it', async (context) => {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 })
  const fixture = createFixture()
  fixture.controller.setWindowVisible(false)
  fixture.controller.setWindowVisible(true)
  fixture.completeShow()
  await Promise.resolve()
  fixture.controller.setWindowVisible(false)
  fixture.controller.setWindowVisible(true)
  context.mock.timers.tick(2000)
  assert.equal(fixture.dock.isVisible(), true)
  assert.equal(fixture.hideCount, 1)
})

test('native Dock show failures are reported without an unhandled rejection', async () => {
  const fixture = createFixture(false)
  fixture.controller.setWindowVisible(true)
  const error = new Error('Dock unavailable')
  fixture.failShow(error)
  await Promise.resolve()
  assert.deepEqual(fixture.errors, [error])
})

test('platforms without a Dock ignore visibility changes', () => {
  const controller = createDockVisibilityController(undefined, () => assert.fail())
  controller.setEnabled(true)
  controller.setWindowVisible(true)
  controller.setWindowVisible(false)
})
