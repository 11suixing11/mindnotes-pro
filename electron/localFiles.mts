import { open, rename, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

/** Read a selected file without allowing growth to bypass its memory limit. */
export async function readLimitedFile(filePath: string, limit: number): Promise<Buffer> {
  const file = await open(filePath, 'r')
  try {
    const info = await file.stat()
    if (!info.isFile() || info.size > limit) throw new Error('文件过大或不是普通文件。')
    const bytes = Buffer.alloc(info.size)
    let offset = 0
    while (offset < bytes.length) {
      const result = await file.read(bytes, offset, bytes.length - offset, offset)
      if (!result.bytesRead) throw new Error('文件在读取期间发生变化，请重试。')
      offset += result.bytesRead
    }
    const extra = await file.read(Buffer.alloc(1), 0, 1, offset)
    if (extra.bytesRead) throw new Error('文件在读取期间发生变化，请重试。')
    return bytes
  } finally {
    await file.close()
  }
}

/** A failed export leaves the previous destination intact. */
export async function writeLocalFile(
  filePath: string,
  content: string | Uint8Array
): Promise<void> {
  const temporary = `${filePath}.${randomUUID()}.writing`
  try {
    const file = await open(temporary, 'wx', 0o600)
    try {
      await file.writeFile(content)
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, filePath)
  } finally {
    await rm(temporary, { force: true })
  }
}
