<div align="center">

<img src=".github/hero.svg" alt="MindNotes Pro" width="100%" />

# MindNotes Pro

### 美しい、プライバシー重視のオフライン対応ホワイトボード ✨

<p>
  <strong>描画、スケッチ、アイデアの整理</strong>を直感的なキャンバス体験で。
  <br/>クラウドなし。追跡なし。あなたの創造力だけ。
</p>

<p>
  <strong>🌐 言語：</strong>
  <a href="README.md">English</a> ·
  <a href="README_CN.md">中文</a> ·
  <strong>日本語</strong>
</p>

<p>
  <a href="https://11suixing11.github.io/mindnotes-pro"><img src="https://img.shields.io/badge/🚀_ライブデモ-4A90D9?style=for-the-badge&logo=github&logoColor=white" alt="ライブデモ" /></a>
  <a href="#クイックスタート"><img src="https://img.shields.io/badge/📦_クイックスタート-2ECC71?style=for-the-badge" alt="クイックスタート" /></a>
</p>

<p>
  <a href="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml"><img src="https://github.com/11suixing11/mindnotes-pro/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/dependencies-3-green" alt="Only 3 dependencies" />
</p>

</div>

---

## 🎬 デモ

<div align="center">
  <img src=".github/demo.gif" alt="MindNotes Pro デモ" width="80%" />
</div>

---

## ✨ MindNotes Pro が選ばれる理由

<table>
<tr>
<td width="50%">

### 🎨 美しいデザイン
モネの印象派パレットにインスパイア — 水彩グラデーション、グラスモーフィズム効果、紙のテクスチャで、デジタル描画を自然な体験に。

### 🔒 プライバシー優先
**ゼロクラウド依存。** すべてのデータはブラウザの localStorage に保存。アカウント不要、追跡なし、サーバーなし。

### ⚡ 超高速
コア依存はわずか **3 つ**（React、Zustand、perfect-freehand）。1 秒以内にロード。PWA でオフライン対応。

</td>
<td width="50%">

### 📝 豊富な機能
- 圧力感応フリーハンド描画
- 図形ツール（四角形、線、矢印）
- インラインテキスト注釈
- 複数選択、リサイズ、移動
- アンドゥ/リドゥ履歴スタック
- システム検出ダークモード
- PDF/PNG エクスポート
- フォルダ付きドキュメント管理

### 🛠 開発者フレンドリー
- TypeScript 厳密モード
- Zustand スライスアーキテクチャ
- 包括的なテストスイート
- クリーンでドキュメント化されたコードベース

</td>
</tr>
</table>

---

## 🚀 クイックスタート

### ライブで試す
👉 **[MindNotes Pro を開く](https://11suixing11.github.io/mindnotes-pro)** — インストール不要！

### ローカルで実行

`ash
# 30秒でクローン＆起動
git clone https://github.com/11suixing11/mindnotes-pro.git
cd mindnotes-pro
npm install
npm run dev
`

[http://localhost:3000](http://localhost:3000) を開いて描画を始めましょう！

### ワンクリックデプロイ

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" height="32" />
  </a>
  <a href="https://app.netlify.com/start/deploy?repository=https://github.com/11suixing11/mindnotes-pro">
    <img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify" height="32" />
  </a>
</p>

---

## 📸 スクリーンショット

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>ライトモード</strong></td>
      <td align="center"><strong>ダークモード</strong></td>
    </tr>
    <tr>
      <td><img src=".github/mindnotes-light.svg" width="400" /></td>
      <td><img src=".github/mindnotes-dark.svg" width="400" /></td>
    </tr>
  </table>
</div>

---

## 🏗 技術スタック

| レイヤー | 技術 | 選定理由 |
|----------|------|----------|
| UI | React 18 + TypeScript | 型安全、モダン |
| 状態管理 | Zustand（6 スライス） | 軽量、高性能 |
| 描画 | perfect-freehand + Canvas | 自然な筆跡 |
| スタイリング | Tailwind CSS | 高速開発 |
| エクスポート | jsPDF（ダイナミックインポート） | バンドルへの影響ゼロ |
| ビルド | Vite 5 | 即時 HMR |
| テスト | Vitest + Testing Library | 高速、信頼性 |

---

## 📊 比較

| 機能 | MindNotes Pro | Excalidraw | tldraw | Miro |
|------|:---:|:---:|:---:|:---:|
| **オープンソース** | ✅ MIT | ✅ MIT | ⚠️ 部分的 | ❌ |
| **ローカルファースト** | ✅ | ❌ | ❌ | ❌ |
| **ゼロ依存** | ✅ (3) | ❌ (30+) | ❌ (50+) | ❌ |
| **オフライン PWA** | ✅ | ⚠️ | ❌ | ❌ |
| **ドキュメント管理** | ✅ | ❌ | ❌ | ✅ |
| **カスタム美学** | ✅ モネ風 | ✅ ハンドrawn | ⚠️ 基本 | ✅ |
| **永久無料** | ✅ | ✅ | ⚠️ | ❌ |

---

## 🤝 コントリビュート

あらゆる形の貢献を歓迎します！バグ報告、機能リクエスト、コード貢献すべてお待ちしています。

- 🐛 **バグを発見？** [Issue を作成](https://github.com/11suixing11/mindnotes-pro/issues/new?template=bug_report.yml)
- 💡 **アイデアがある？** [機能リクエスト](https://github.com/11suixing11/mindnotes-pro/issues/new?template=feature_request.yml)
- 🔧 **コードを書きたい？** [CONTRIBUTING.md](CONTRIBUTING.md) を確認
- ⭐ **プロジェクトが気に入った？** Star でサポートを表明！

[good first issue](https://github.com/11suixing11/mindnotes-pro/labels/good%20first%20issue) ラベルを探してください — 初心者に最適です。

---

## 🌟 Star 履歴

<div align="center">
  <a href="https://star-history.com/#11suixing11/mindnotes-pro&Date">
    <img src="https://api.star-history.com/svg?repos=11suixing11/mindnotes-pro&type=Date" alt="Star History" width="600" />
  </a>
</div>

---

## 📄 ライセンス

本プロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

---

<div align="center">

**[11suixing11](https://github.com/11suixing11) が ❤️ を込めて構築**

<p>
  <sub>MindNotes Pro を便利に感じたら、⭐ をお願いします — 他のユーザーの発見に役立ちます！</sub>
</p>

</div>
