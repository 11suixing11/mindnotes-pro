// jsdom returns null for canvas contexts and logs a noisy "not implemented" error.
// Individual rendering tests replace this stub with context-specific mocks.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => null,
})
