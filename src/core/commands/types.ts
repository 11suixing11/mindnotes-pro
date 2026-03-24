export type CommandCategory = 'tool' | 'edit' | 'view' | 'file' | 'ui' | 'help'

export type CommandId =
  | 'tool.pen'
  | 'tool.eraser'
  | 'tool.pan'
  | 'tool.rectangle'
  | 'tool.circle'
  | 'tool.triangle'
  | 'tool.line'
  | 'tool.arrow'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.clear'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.reset'
  | 'view.toggleGuides'
  | 'view.toggleGrid'
  | 'file.save'
  | 'ui.toggleLayersPanel'
  | 'help.shortcuts'

export type CommandPayload = unknown

export type CommandHandler<TPayload = CommandPayload> =
  | ((payload?: TPayload) => void)
  | ((payload?: TPayload) => Promise<void>)

export interface CommandDescriptor {
  id: CommandId
  description: string
  category: CommandCategory
  enabled?: boolean
}

export interface Command extends CommandDescriptor {
  handler: CommandHandler
}
