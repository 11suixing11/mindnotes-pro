import type { ElectronApplication } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'
import { PNG } from 'pngjs'
import path from 'node:path'
import type { ScreenStroke } from '../../src/notes/screenInk'

/** Seed real SQLite data; capture itself is verified in separate native-screen journeys. */
export async function seedScreenNote(
  application: ElectronApplication,
  options: { maximum?: boolean; title?: string } = {}
): Promise<void> {
  const fixture = await application.evaluate(({ app, screen }) => {
    const display = screen.getPrimaryDisplay()
    const width = display.bounds.width
    const height = display.bounds.height
    return {
      directory: app.getPath('userData'),
      width,
      height,
      display: display.label,
    }
  })
  const image = new PNG({ width: 320, height: 200 })
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = 25
    image.data[offset + 1] = 87
    image.data[offset + 2] = 147
    image.data[offset + 3] = 255
  }
  const png = PNG.sync.write(image)
  const connection = new DatabaseSync(path.join(fixture.directory, 'screen-notes.sqlite'))
  const strokes: ScreenStroke[] = options.maximum
    ? Array.from({ length: 1000 }, (_, index) => ({
        id: `fixture_ink_${index}`,
        tool: 'pen',
        color: '#e05d52',
        width: 4,
        points: Array.from({ length: 160 }, (_, point) => ({
          x: 20 + point * 6,
          y: 40 + (index % 50) * 18 + Math.sin(point / 10) * 3,
        })),
      }))
    : [
        {
          id: 'fixture_ink',
          tool: 'pen',
          color: '#e05d52',
          width: 4,
          points: [
            { x: 100, y: 160 },
            { x: 280, y: 170 },
          ],
        },
      ]
  try {
    const note = {
      id: 'fixture_note',
      title: options.title ?? '本地编辑验收样本',
      comment: '',
      source: { app: '测试样本', title: '编辑与保存验收', display: fixture.display },
      width: fixture.width,
      height: fixture.height,
      strokes,
      createdAt: 1,
      updatedAt: 1,
      revision: 1,
      trashedAt: null,
    }
    connection
      .prepare(
        `INSERT INTO notes(id,document,title,comment,source_text,created_at,updated_at,trashed_at,image,thumbnail,source_app,source_title,source_display,stroke_count)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        note.id,
        JSON.stringify(note),
        note.title,
        note.comment,
        `${note.source.app} ${note.source.title} ${note.source.display}`,
        note.createdAt,
        note.updatedAt,
        note.trashedAt,
        png,
        `data:image/png;base64,${png.toString('base64')}`,
        note.source.app,
        note.source.title,
        note.source.display,
        strokes.length
      )
  } finally {
    connection.close()
  }
}
