# Autonomous Health Snapshot

- Generated At: 2026-03-24 21:33:43
- Overall: HEALTHY
- Critical Failures: 0

## Recent Runs (Last 3)

| Run | Generated At | Overall | Overall Delta | Critical Failures | Critical Delta | Bundle Budget | Budget Delta | Source |
|---:|---|---|---|---:|---|---|---|---|
| 1 | 2026-03-24 21:33:43 | HEALTHY | SAME | 0 | SAME | PASS | SAME | current-run |
| 2 | 2026-03-24 21:23:57 | HEALTHY | SAME | 0 | SAME | PASS | SAME | AUTONOMOUS_HEALTH_SNAPSHOT_20260324-212357.md |
| 3 | 2026-03-24 21:23:08 | HEALTHY | N/A | 0 | N/A | PASS | N/A | AUTONOMOUS_HEALTH_SNAPSHOT_20260324-212308.md |

| Check | Status | Critical | Duration(s) | Exit |
|---|---|---|---:|---:|
| Multi Env | PASS | No | 0.75 | 0 |
| Web Build | PASS | Yes | 5.32 | 0 |
| Unit Tests | PASS | Yes | 2.1 | 0 |
| Coverage | PASS | Yes | 2.21 | 0 |
| Lint | PASS | Yes | 0.89 | 0 |
| Prod Audit | PASS | Yes | 2.43 | 0 |
| Electron Smoke | PASS | Yes | 0.58 | 0 |
| Bundle Analyze | PASS | No | 0.22 | 0 |
| Bundle Budget | PASS | No | 0.23 | 0 |

## Slowest Checks (Top 3)

| Rank | Check | Duration(s) | Status | Critical |
|---:|---|---:|---|---|
| 1 | Web Build | 5.32 | PASS | Yes |
| 2 | Prod Audit | 2.43 | PASS | Yes |
| 3 | Coverage | 2.21 | PASS | Yes |

## Command Details

### Multi Env
- Command: `npm run health:multi`
- Result: PASS
- Duration: 0.75s

```text
> mindnotes-pro@1.3.2 health:multi
> powershell -ExecutionPolicy Bypass -File ./scripts/check-multi-platform-env.ps1


=== Multi-platform Environment Health ===

Item                Status  De
                            ta
                            il
----                ------  --
Node.js             OK      v2
npm                 OK      11
Java / JAVA_HOME    MISSING Se
Rust cargo          MISSING In
Android project dir OK      an
Tauri project dir   OK      sr



Detected 2 missing requirements.
```

### Web Build
- Command: `npm run build`
- Result: PASS
- Duration: 5.32s

```text
> mindnotes-pro@1.3.2 build
> tsc && vite build

[36mvite v5.4.21 [32mbuilding for production...[36m[39m
transforming...
[32m鉁?[39m 850 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                              [39m[1m[2m    1.25 kB[22m[1m[22m[2m 鈹?gzip:   0.65 kB[22m
[2mdist/[22m[35mcss/index.DTX4cB8d.css                  [39m[1m[2m   42.22 kB[22m[1m[22m[2m 鈹?gzip:   7.69 kB[22m
[2mdist/[22m[36mjs/Canvas.BWqIaJtc.js                   [39m[1m[2m    1.48 kB[22m[1m[22m[2m 鈹?gzip:   0.65 kB[22m
[2mdist/[22m[36mjs/AIResultPanel.DTfbJKeb.js            [39m[1m[2m    1.82 kB[22m[1m[22m[2m 鈹?gzip:   0.75 kB[22m
[2mdist/[22m[36mjs/ConflictResolutionPanel.IZ8W57YW.js  [39m[1m[2m    2.73 kB[22m[1m[22m[2m 鈹?gzip:   1.31 kB[22m
[2mdist/[22m[36mjs/WelcomeGuide.BOJmgS6m.js             [39m[1m[2m    3.16 kB[22m[1m[22m[2m 鈹?gzip:   1.54 kB[22m
[2mdist/[22m[36mjs/AIDevToolsPanel.opwogfgq.js          [39m[1m[2m    7.33 kB[22m[1m[22m[2m 鈹?gzip:   3.38 kB[22m
[2mdist/[22m[36mjs/Toolbar.gA1s29bi.js                  [39m[1m[2m   14.27 kB[22m[1m[22m[2m 鈹?gzip:   5.47 kB[22m
[2mdist/[22m[36mjs/index.CQT3x2Cy.js                    [39m[1m[2m   25.44 kB[22m[1m[22m[2m 鈹?gzip:   8.21 kB[22m
[2mdist/[22m[36mjs/vendor-react.KVYKAF8N.js             [39m[1m[2m  144.57 kB[22m[1m[22m[2m 鈹?gzip:  46.46 kB[22m
[2mdist/[22m[36mjs/vendor.DkJCKYBA.js                   [39m[1m[2m  570.35 kB[22m[1m[22m[2m 鈹?gzip: 182.81 kB[22m
[2mdist/[22m[36mjs/vendor-tldraw.BGV2gmcV.js            [39m[1m[2m1,102.90 kB[22m[1m[22m[2m 鈹?gzip: 328.61 kB[22m
[32m鉁?built in 3.37s[39m
```

### Unit Tests
- Command: `npm run test -- --run`
- Result: PASS
- Duration: 2.1s

```text
> mindnotes-pro@1.3.2 test
> vitest --run


[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/Users/xnn/Desktop/Project/mindnotes-pro[39m

 [32m鉁?[39m src/App.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m鉁?[39m src/core/commands/registry.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m鉁?[39m src/store/useAppStore.test.ts [2m([22m[2m26 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m鉁?[39m src/store/useThemeStore.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m鉁?[39m src/core/keybindings/KeybindingManager.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 80[2mms[22m[39m
 [32m鉁?[39m src/hooks/useServiceWorker.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 695[2mms[22m[39m

[2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m      Tests [22m [1m[32m61 passed[39m[22m[90m (61)[39m
[2m   Start at [22m 21:33:50
[2m   Duration [22m 1.64s[2m (transform 210ms, setup 0ms, import 467ms, tests 796ms, environment 3.08s)[22m
```

### Coverage
- Command: `npm run test:coverage -- --run`
- Result: PASS
- Duration: 2.21s

```text
> mindnotes-pro@1.3.2 test:coverage
> vitest --coverage --run


[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90mC:/Users/xnn/Desktop/Project/mindnotes-pro[39m
      [2mCoverage enabled with [22m[33mv8[39m

 [32m鉁?[39m src/App.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[32m 2[2mms[22m[39m
 [32m鉁?[39m src/core/commands/registry.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m鉁?[39m src/store/useThemeStore.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m鉁?[39m src/store/useAppStore.test.ts [2m([22m[2m26 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m鉁?[39m src/core/keybindings/KeybindingManager.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 73[2mms[22m[39m
 [32m鉁?[39m src/hooks/useServiceWorker.test.ts [2m([22m[2m9 tests[22m[2m)[22m[33m 707[2mms[22m[39m

[2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m      Tests [22m [1m[32m61 passed[39m[22m[90m (61)[39m
[2m   Start at [22m 21:33:52
[2m   Duration [22m 1.56s[2m (transform 284ms, setup 0ms, import 478ms, tests 801ms, environment 3.02s)[22m

[34m % [39m[2mCoverage report from [22m[33mv8[39m
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   86.43 |    71.12 |   91.75 |   87.88 |                   
 core/commands     |   93.33 |    77.77 |     100 |   93.33 |                   
  registry.ts      |   93.33 |    77.77 |     100 |   93.33 | 46,75             
 core/keybindings  |   84.84 |    68.23 |     100 |   88.04 |                   
  ...ingManager.ts |   84.84 |    68.23 |     100 |   88.04 | ...68,179-180,198 
 hooks             |   83.69 |    58.82 |      75 |    87.2 |                   
  ...viceWorker.ts |   83.69 |    58.82 |      75 |    87.2 | ...20-121,128-129 
 store             |   88.54 |       82 |   92.85 |   86.41 |                   
  useAppStore.ts   |      98 |      100 |   97.91 |   97.22 | 252               
  useThemeStore.ts |   78.26 |     62.5 |    62.5 |   77.77 | ...95-102,111,117 
-------------------|---------|----------|---------|---------|-------------------
```

### Lint
- Command: `npm run lint`
- Result: PASS
- Duration: 0.89s

```text
> mindnotes-pro@1.3.2 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0
```

### Prod Audit
- Command: `npm audit --omit=dev --registry=https://registry.npmjs.org`
- Result: PASS
- Duration: 2.43s

```text
found 0 vulnerabilities
```

### Electron Smoke
- Command: `npm run electron:smoke`
- Result: PASS
- Duration: 0.58s

```text
> mindnotes-pro@1.3.2 electron:smoke
> powershell -ExecutionPolicy Bypass -File ./scripts/check-electron-smoke.ps1

=== Electron Smoke Check ===
[OK] dist/index.html exists
[OK] Electron smoke checks passed
```

### Bundle Analyze
- Command: `npm run bundle:analyze`
- Result: PASS
- Duration: 0.22s

```text
> mindnotes-pro@1.3.2 bundle:analyze
> node ./scripts/optimize-bundle.js

馃搳 寮€濮嬪垎鏋愭瀯寤轰骇鐗?..

馃摝 鍒嗘瀽鏂囦欢...
鉁?鎶ュ憡宸蹭繚瀛樺埌锛?/performance-reports/bundle-analysis.md

# 馃摝 Bundle 鍒嗘瀽鎶ュ憡

**鐢熸垚鏃堕棿**: 2026-03-24T13:33:58.458Z

## 鏂囦欢鍒楄〃

| 鏂囦欢 | 鍘熷澶у皬 | Gzip 浼扮畻 | 鍗犳瘮 |
|------|----------|----------|------|
| dist/js/vendor-tldraw.BGV2gmcV.js | 1077.48 KB | 323.24 KB | 57.1% |
| dist/js/vendor.DkJCKYBA.js | 557.75 KB | 167.32 KB | 29.6% |
| dist/js/vendor-react.KVYKAF8N.js | 141.18 KB | 42.36 KB | 7.5% |
| dist/css/index.DTX4cB8d.css | 41.23 KB | 12.37 KB | 2.2% |
| dist/js/index.CQT3x2Cy.js | 25.49 KB | 7.65 KB | 1.4% |
| dist/js/Toolbar.gA1s29bi.js | 14.78 KB | 4.43 KB | 0.8% |
| dist/sw-v2.js | 8.50 KB | 2.55 KB | 0.5% |
| dist/js/AIDevToolsPanel.opwogfgq.js | 7.76 KB | 2.33 KB | 0.4% |
| dist/sw.js | 3.44 KB | 1.03 KB | 0.2% |
| dist/js/WelcomeGuide.BOJmgS6m.js | 3.31 KB | 0.99 KB | 0.2% |
| dist/js/ConflictResolutionPanel.IZ8W57YW.js | 2.77 KB | 0.83 KB | 0.1% |
| dist/js/AIResultPanel.DTfbJKeb.js | 1.81 KB | 0.54 KB | 0.1% |
| dist/js/Canvas.BWqIaJtc.js | 1.44 KB | 0.43 KB | 0.1% |

**鎬昏**: 1886.94 KB (Gzip: 566.08 KB)

## 浼樺寲寤鸿

### 鈿狅笍 澶ф枃浠惰鍛?
- **dist/js/vendor-tldraw.BGV2gmcV.js**: 1077.48 KB
- **dist/js/vendor.DkJCKYBA.js**: 557.75 KB
- **dist/js/vendor-react.KVYKAF8N.js**: 141.18 KB

### 馃搻 tldraw 鐩稿叧

tldraw 鐩稿叧鏂囦欢鎬诲ぇ灏忥細**1077.48 KB**

**浼樺寲寤鸿**:
- [ ] 浣跨敤鍔ㄦ€佸鍏?(lazy loading)
- [ ] 鎸夐渶鍔犺浇缁勪欢
- [ ] 鑰冭檻浠ｇ爜鍒嗗壊

## 鎬讳綋璇勪环

鉂?**闇€浼樺寲**: 鎬诲ぇ灏忚秴杩?1MB锛岄渶瑕佺珛鍗充紭鍖?
```

### Bundle Budget
- Command: `npm run bundle:budget`
- Result: PASS
- Duration: 0.23s

```text
> mindnotes-pro@1.3.2 bundle:budget
> node ./scripts/check-bundle-budget.js

=== Bundle Budget Check ===
PASS total-js: 1845.71KB (limit 2000.00KB)
PASS vendor-tldraw: 1077.48KB (limit 1150.00KB)
PASS vendor-group: 1776.41KB (limit 1800.00KB)
```
