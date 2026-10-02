export function normalizeThemeCss(css: string): string {
  const hasLegacyHeroUIVars = /--heroui-(primary|secondary|warning|danger)\s*:/i.test(css)

  if (!hasLegacyHeroUIVars) return css

  const hasToken = (token: string): boolean => {
    return new RegExp(`--${token}\\s*:`, 'i').test(css)
  }

  const declarations = [
    !hasToken('accent') && '  --accent: hsl(var(--heroui-primary)) !important;',
    !hasToken('accent-foreground') &&
      '  --accent-foreground: hsl(var(--heroui-primary-foreground, 0 0% 100%)) !important;',
    !hasToken('color-accent') && '  --color-accent: var(--accent) !important;',
    !hasToken('color-accent-foreground') &&
      '  --color-accent-foreground: var(--accent-foreground) !important;',
    !hasToken('secondary') &&
      '  --secondary: hsl(var(--heroui-secondary, var(--heroui-primary))) !important;',
    !hasToken('secondary-foreground') &&
      '  --secondary-foreground: hsl(var(--heroui-secondary-foreground, 0 0% 100%)) !important;',
    !hasToken('success') && '  --success: hsl(var(--heroui-success, 145 79% 44%)) !important;',
    !hasToken('success-foreground') &&
      '  --success-foreground: hsl(var(--heroui-success-foreground, 0 0% 100%)) !important;',
    !hasToken('warning') && '  --warning: hsl(var(--heroui-warning, 37 91% 55%)) !important;',
    !hasToken('warning-foreground') &&
      '  --warning-foreground: hsl(var(--heroui-warning-foreground, 0 0% 0%)) !important;',
    !hasToken('danger') && '  --danger: hsl(var(--heroui-danger, 339 90% 51%)) !important;',
    !hasToken('danger-foreground') &&
      '  --danger-foreground: hsl(var(--heroui-danger-foreground, 0 0% 100%)) !important;',
    '  --segment: hsl(var(--heroui-primary)) !important;',
    '  --segment-foreground: hsl(var(--heroui-primary-foreground, 0 0% 100%)) !important;',
    !hasToken('color-segment') && '  --color-segment: var(--segment) !important;',
    !hasToken('color-segment-foreground') &&
      '  --color-segment-foreground: var(--segment-foreground) !important;',
    !hasToken('focus') && '  --focus: hsl(var(--heroui-focus, var(--heroui-primary))) !important;'
  ].filter(Boolean)

  if (declarations.length === 0) return css

  return `${css}

/* Sparkle compatibility: HeroUI v2 -> v3 token bridge */
.dark,
.light,
.default,
[data-theme='dark'],
[data-theme='light'],
[data-theme='default'] {
${declarations.join('\n')}
}`
}
