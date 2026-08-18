# Declarative Workflow Builder for Microsoft Agent Framework

キャンバス上で Microsoft Agent Framework の宣言型ワークフロー YAML を視覚的に組み立てるための React アプリケーションです。

## 概要

このプロジェクトでは、YAML を手書きしなくても、対話的にワークフロー定義を編集できます。主な機能は次のとおりです。

- Python / C# などの形式を選択
- 組み込みサンプルワークフローを読み込む
- ローカルの YAML をインポートする
- キャンバス上でアクションを追加し、インスペクタで編集する
- 生成された YAML をそのままコピーして利用する

実際の UI 実装は `src/ui` 配下にあり、ワークフローのモデル、グラフ生成、YAML 解析、テストコードは機能ごとに整理されています。

## 主な機能

- ノードを視覚的に操作できるワークフロー編集
- `If` や `ConditionGroup` のようなコンテナ型の分岐
- `Then` / `Else` / 条件ブロック内へのアクション追加
- 右側のパネルで YAML をプレビューし出力
- 一般的なパターン向けのサンプルワークフロー
- 型安全なドメインロジックとグラフレイアウト処理

## ディレクトリ構成

```text
.
├── docs/
│   ├── declarative-workflow-spec-ja.md
│   └── workflow-builder-plan.md
├── src/
│   └── ui/
│       ├── package.json
│       ├── public/
│       └── src/
│           ├── App.tsx
│           ├── features/
│           │   └── workflow-builder/
│           └── ...
└── README.ja.md
```

## セットアップ

```bash
cd src/ui
npm install
npm run dev
```

その後、ブラウザで通常は http://localhost:5173 を開いて利用します。

## 利用可能なスクリプト

| コマンド             | 内容                                        |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | 開発サーバーを起動する                      |
| `npm run build`      | TypeScript のビルドと本番バンドルを生成する |
| `npm test`           | Vitest を 1 回実行する                      |
| `npm run test:watch` | Vitest を監視モードで実行する               |
| `npm run lint`       | Linter を実行する                           |
| `npm run format`     | Prettier でコード整形を行う                 |

## 使い方

1. Python または C# の形式を選択する
2. 1 つ以上のアクションを追加して形式を固定する
3. サンプルワークフローを読み込むか、自分の YAML をインポートする
4. キャンバス上のノードをクリックして編集する
5. プレビュー欄に表示された YAML をコピーして利用する

`If` と `ConditionGroup` はコンテナとして描画され、`Then` / `Else` / 条件ごとの中にアクションが配置されます。

## アーキテクチャの意図

コードは責務ごとに分かれています。

- `src/features/workflow-builder/domain/` — UI やレイアウトに依存しないモデルロジック
- `src/features/workflow-builder/graph/` — ワークフローからグラフやエッジを生成する処理
- `src/features/workflow-builder/components/` — React コンポーネント群
- `src/features/workflow-builder/utils/` — YAML の生成・解析処理

依存の向きは `domain -> graph -> components` という一方向に整理されています。

## 技術スタック

- React 19
- TypeScript
- Vite
- @xyflow/react
- yaml
- Vitest
- Oxlint
- Prettier

## ドキュメント

- [宣言型ワークフロー YAML 仕様メモ](docs/declarative-workflow-spec-ja.md) — 仕様と実装上の注意点
- [開発計画と実装状況](docs/workflow-builder-plan.md) — アーキテクチャ判断、設計メモ、残課題

## ライセンス

このプロジェクトは、リポジトリ内での開発・検証用途としてそのまま利用できる前提で提供されています。
