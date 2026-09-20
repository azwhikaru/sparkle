import { existsSync } from 'fs'
import { readFile, rename, unlink, writeFile } from 'fs/promises'
import { profileRulesPath } from '../utils/dirs'
import { parseYaml, stringifyYaml } from '../utils/yaml'

interface ProfileRulesConfig {
  rules: string[]
}

export async function getProfileRules(id: string | undefined): Promise<string[] | undefined> {
  const target = profileRulesPath(id)
  if (!existsSync(target)) return undefined

  const config = parseYaml<Partial<ProfileRulesConfig>>(await readFile(target, 'utf-8'))
  if (!config || !Array.isArray(config.rules)) return undefined
  return config.rules.filter((rule): rule is string => typeof rule === 'string')
}

export async function setProfileRules(id: string | undefined, rules: string[]): Promise<void> {
  const target = profileRulesPath(id)
  const temporary = `${target}.tmp`
  await writeFile(temporary, stringifyYaml({ rules }), 'utf-8')

  if (process.platform === 'win32' && existsSync(target)) {
    await unlink(target)
  }
  await rename(temporary, target)
}

export async function removeProfileRules(id: string | undefined): Promise<void> {
  const target = profileRulesPath(id)
  if (existsSync(target)) await unlink(target)
}
