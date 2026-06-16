# Reddit r/webdev 改进版

## 标题

I got tired of whiteboard apps that need accounts and track everything, so I built one that loads in under 1 second with only 3 dependencies

## 正文（直接复制这段，Reddit会自动渲染Markdown）

Every whiteboard app I tried wanted me to sign up, sync to the cloud, or install a 50MB Electron wrapper. I just wanted to sketch.

So I built **MindNotes Pro** — a local-first whiteboard that runs entirely in your browser.

**What makes it different:**

- **3 dependencies** — React, Zustand, perfect-freehand. That's it.
- **<200KB bundle** — loads before your coffee cools
- **Zero cloud** — everything stays in localStorage, works offline as PWA
- **No accounts** — open the URL and start drawing

**What you can do with it:**

- 6 brush types (pen, pencil, highlighter, calligraphy, glow pen, eraser)
- Shapes: rectangles, circles, lines, arrows
- Text annotations, paste images directly
- Frame select, resize, move, snap & align
- Undo/redo, dark mode
- Export to PDF or PNG
- Multi-document workspace with folder hierarchy

**Why only 3 dependencies?**

I wanted to prove a point: beautiful software doesn't need 50 packages. The drawing engine is `perfect-freehand` (11KB), state management is `Zustand` (2KB), and everything else is React + Canvas API.

**Try it:** https://11suixing11.github.io/mindnotes-pro/

**Source:** https://github.com/11suixing11/mindnotes-pro

Feedback I'd love:

- Does it feel fast on your device?
- What's the one feature that would make you switch from your current tool?
- Any accessibility issues?

Thanks for checking it out!
