# Reddit r/webdev 改进版

## 标题

I got tired of whiteboard apps that need accounts and cloud storage, so I built a local-first one

## 正文（直接复制这段，Reddit会自动渲染Markdown）

Every whiteboard app I tried wanted me to sign up, sync to the cloud, or install a 50MB Electron wrapper. I just wanted to sketch.

So I built **MindNotes Pro** — a local-first whiteboard that runs entirely in your browser.

**What makes it different:**

- **Local-first storage** — the current board stays in browser IndexedDB
- **Portable backups** — export JSON plus PNG, JPEG, PDF, and SVG
- **Offline-capable** — works as an installable PWA after the first load
- **No accounts** — open the URL and start drawing

**What you can do with it:**

- 6 brush types (pen, pencil, highlighter, calligraphy, glow pen, eraser)
- Shapes: rectangles, circles, lines, arrows
- Text annotations, paste images directly
- Frame select, resize, move, snap & align
- Undo/redo, dark mode
- Export to PDF or PNG
- Focused single-board workspace with layers

**Why local-first?**

I wanted a personal drawing surface that does not require an account or hosted workspace. The board remains on the device, while explicit exports make important work portable.

**Try it:** https://11suixing11.github.io/mindnotes-pro/

**Source:** https://github.com/11suixing11/mindnotes-pro

Feedback I'd love:

- Does it feel fast on your device?
- What's the one feature that would make you switch from your current tool?
- Any accessibility issues?

Thanks for checking it out!
