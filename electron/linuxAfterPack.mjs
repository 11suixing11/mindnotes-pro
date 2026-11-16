import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const adaptedDebHelpers = new WeakMap()

function adaptDebDesktopEntry(context) {
  const targets = context.targets ?? []
  if (!Array.isArray(targets)) throw new Error('Unsupported Linux targets interface')
  const debTargets = targets.filter((target) => target?.name === 'deb')
  if (debTargets.length === 0) return
  if (debTargets.length !== 1) throw new Error('Expected one deb target')
  const { helper, options } = debTargets[0]
  const packager = context.packager
  if (
    packager.info?.metadata?.name !== 'mindnotes-pro' ||
    packager.info?.metadata?.desktopName !== 'com.mindnotes.pro.desktop' ||
    packager.config?.appId !== 'com.mindnotes.pro' ||
    packager.appInfo?.productName !== 'MindNotes Pro' ||
    packager.appInfo?.sanitizedProductName !== 'MindNotes Pro' ||
    packager.executableName !== 'mindnotes-pro' ||
    helper?.packager !== packager ||
    typeof helper?.computeDesktopEntry !== 'function' ||
    typeof helper?.writeDesktopEntry !== 'function' ||
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new Error('Unsupported MindNotes deb project or helper interface')
  }
  const adapted = adaptedDebHelpers.get(helper)
  if (adapted) {
    if (adapted.options !== options || helper.computeDesktopEntry !== adapted.wrapper) {
      throw new Error('Changed deb helper after adaptation')
    }
    return
  }
  const original = helper.computeDesktopEntry
  const wrapper = async function (...args) {
    if (this !== helper) throw new Error('Changed deb helper receiver')
    if (args[1] != null) return original.apply(this, args)
    if (args[0] !== options) throw new Error('Unknown default deb desktop options')
    const desktop = await original.apply(this, args)
    const executable = /^Exec="\/opt\/MindNotes Pro\/mindnotes-pro"(?= |$)/m
    if (
      typeof desktop !== 'string' ||
      (desktop.match(/^Exec=.*$/gm) ?? []).length !== 1 ||
      !executable.test(desktop)
    ) {
      throw new Error('Unsupported default deb desktop Exec')
    }
    return desktop.replace(executable, 'Exec="/opt/MindNotes Pro/AppRun"')
  }
  helper.computeDesktopEntry = wrapper
  adaptedDebHelpers.set(helper, { options, wrapper })
}

export function validateAppImageCopyOrder(source) {
  for (const name of ['buildStaticRuntimeAppImage', 'buildLegacyFuse2AppImage']) {
    const start = source.indexOf(`async function ${name}(`)
    const next = source.indexOf('\nasync function ', start + 1)
    const body = source.slice(start, next === -1 ? undefined : next)
    const launcher = body.indexOf('await writeAppLauncherAndRelatedFiles(opts);')
    const copy = body.indexOf('await (0, builder_util_1.copyDir)(appDir, stageDir);')
    if (start === -1 || launcher === -1 || copy <= launcher) {
      throw new Error(`Unsupported electron-builder AppImage copy order: ${name}`)
    }
  }
}

export default async function linuxAfterPack(context) {
  if (['win32', 'darwin'].includes(context.electronPlatformName)) return
  if (context.electronPlatformName !== 'linux') {
    throw new Error('Unsupported afterPack platform')
  }
  const executableName = context.packager?.executableName
  if (
    typeof executableName !== 'string' ||
    !/^[\p{L}\p{N}._ ()-]+$/u.test(executableName) ||
    ['.', '..'].includes(executableName)
  ) {
    throw new Error('Unsafe or missing Linux executable name')
  }
  const builderSource = await fs.readFile(
    require.resolve('app-builder-lib/out/targets/appimage/appImageUtil.js'),
    'utf8'
  )
  validateAppImageCopyOrder(builderSource)
  adaptDebDesktopEntry(context)
  // Both supported targets copy appOutDir over their generated AppRun. Guard that
  // ordering above so an upstream change cannot restore silent sandbox fallback.
  const launcher = `#!/usr/bin/env bash
set -e
app_dir="\${APPDIR:-$(dirname -- "$(readlink -f -- "$0")")}"
export PATH="\${app_dir}:\${app_dir}/usr/sbin\${PATH:+:\${PATH}}"
export XDG_DATA_DIRS="\${app_dir}/usr/share/\${XDG_DATA_DIRS:+:\${XDG_DATA_DIRS}}:/usr/share/gnome:/usr/local/share/:/usr/share/"
export LD_LIBRARY_PATH="\${app_dir}/usr/lib\${LD_LIBRARY_PATH:+:\${LD_LIBRARY_PATH}}"
export GSETTINGS_SCHEMA_DIR="\${app_dir}/usr/share/glib-2.0/schemas\${GSETTINGS_SCHEMA_DIR:+:\${GSETTINGS_SCHEMA_DIR}}"
has_ozone=0
for arg in "$@"; do
  case "$arg" in
    --) break ;;
    --ozone-platform|--ozone-platform=*|--ozone-platform-hint|--ozone-platform-hint=*)
      has_ozone=1
      break
      ;;
  esac
done
if [ -n "\${DISPLAY:-}" ] && [ "$has_ozone" -eq 0 ]; then
  set -- --ozone-platform=x11 "$@"
fi
exec "$app_dir"/'${executableName}' "$@"
`
  await fs.writeFile(path.join(context.appOutDir, 'AppRun'), launcher, { mode: 0o755 })
}
