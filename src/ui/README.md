# Declarative Workflow Builder

Microsoft Agent Framework の宣言型ワークフロー YAML を、キャンバス上で組み立てるための React アプリ。

## セットアップ

```bash
cd src/ui
npm install
npm run dev
```

## スクリプト

| コマンド             | 内容                                  |
| -------------------- | ------------------------------------- |
| `npm run dev`        | 開発サーバーを起動する                |
| `npm run build`      | 型チェック（`tsc -b`）と本番ビルド    |
| `npm test`           | Vitest を 1 回実行する                |
| `npm run test:watch` | Vitest を監視モードで実行する         |
| `npm run lint`       | Oxlint を実行する                     |
| `npm run format`     | Prettier で整形する。コミット前に必要 |

## 使い方

1. **Style** で Python 形式か C# 形式を選ぶ。アクションを 1 つでも追加すると固定され、変更するには **New workflow** で作り直す
2. **Sample** から公式サンプルを読み込むか、**Import YAML** でローカルファイルを開く
3. キャンバス上の `+` からアクションを追加し、ノードをクリックして編集する
4. 右ペインの YAML をそのままコピーして使う

`If` と `ConditionGroup` はコンテナとして描画され、`Then` / `Else` / 各条件の中にアクションを持つ。ヘッダーの `−` で折りたためる。

## 構成

- `src/features/workflow-builder/domain/` — 座標に依存しないモデル操作
- `src/features/workflow-builder/graph/` — モデルから描画用ノード・結線を生成
- `src/features/workflow-builder/components/` — React コンポーネント
- `src/features/workflow-builder/utils/` — YAML の生成と解析

依存の向きは `domain` → `graph` → `components` の一方向。

## 技術スタック

React 19 / TypeScript / Vite / [@xyflow/react](https://reactflow.dev/) / [yaml](https://eemeli.org/yaml/) / Vitest / Oxlint / Prettier

## ドキュメント

- [宣言型ワークフロー YAML 仕様メモ](../../docs/declarative-workflow-spec-ja.md) — 仕様と、実装で判明した注意点
- [開発計画と実装状況](../../docs/workflow-builder-plan.md) — アーキテクチャ、設計判断、残課題
