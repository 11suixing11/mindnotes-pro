declare module 'undo-manager' {
  export class UndoManager {
    constructor()
    setLimit(limit: number): void
    on(event: string, callback: () => void): void
    clear(): void
    getState(): any
  }
}
