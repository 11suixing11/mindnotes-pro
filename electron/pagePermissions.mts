import type { Session } from 'electron'

/** Reading pages do not need access to devices or the surrounding desktop. */
export function restrictPagePermissions(session: Session): void {
  session.setPermissionCheckHandler(() => false)
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.setDevicePermissionHandler(() => false)
  session.setDisplayMediaRequestHandler((_request, callback) => callback({}))
}
