import type { VersionMetadata, ReleaseChannelName } from './types'

/**
 * 版本追踪器
 */
export class VersionTracker {
  private versions: Map<string, VersionMetadata> = new Map()

  register(metadata: VersionMetadata): void {
    const key = `${metadata.channel}-${metadata.version}`
    this.versions.set(key, metadata)
  }

  getVersion(channel: ReleaseChannelName, version: string): VersionMetadata | undefined {
    const key = `${channel}-${version}`
    return this.versions.get(key)
  }

  getLatestVersion(channel: ReleaseChannelName): VersionMetadata | undefined {
    let latest: VersionMetadata | undefined
    let latestBuild = -1

    this.versions.forEach((metadata, key) => {
      if (key.startsWith(`${channel}-`)) {
        if (metadata.buildNumber > latestBuild) {
          latest = metadata
          latestBuild = metadata.buildNumber
        }
      }
    })

    return latest
  }

  getAllVersions(): VersionMetadata[] {
    return Array.from(this.versions.values())
  }

  getVersionsByChannel(channel: ReleaseChannelName): VersionMetadata[] {
    return Array.from(this.versions.values()).filter(v => v.channel === channel)
  }

  getCount(): number {
    return this.versions.size
  }
}

export default VersionTracker
