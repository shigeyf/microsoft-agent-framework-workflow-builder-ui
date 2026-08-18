# YAML ワークフロー GUI 開発計画

## 1. 目的

Microsoft Agent Framework の宣言型ワークフロー仕様をもとに、YAML を手入力ではなくフォームベースで組み立てられる React アプリを開発する。

目的は以下の3点。

- YAML 仕様の習得を支援する
- ワークフロー定義のミスを減らす
- 生成された YAML をそのまま保存・コピーできる体験を提供する

## 2. 対象ユーザー

- AI エージェントや自動化フローを設計する開発者
- YAML レイアウトを理解し始めたプロトタイプ担当者
- 宣言型ワークフローの設計レビューを行うチーム

## 3. 要件

### 3.1 機能要件

- ワークフローの基本情報を入力できる
  - ワークフロー名
  - 説明
  - 入力パラメータ
  - トリガー種別
- アクションを追加・削除・変更できる
- サポート対象アクション
  - `SetVariable`
  - `SendActivity`
  - `If`
  - `InvokeAzureAgent`
  - `Question`
- YAML をリアルタイムで生成する
- 生成した YAML をクリップボードへコピーできる
- C# 形式と Python 形式を切り替えられる

### 3.2 非機能要件

- シンプルで軽量な UI
- TypeScript による型安全性
- Vite ベースでの高速な開発体験
- YAML のプレビューと編集が同時に確認できること

## 4. コンポーネント設計

### 4.1 画面構成

1. ヘッダー
   - タイトル
   - YAML 形式切替（C# / Python）
   - YAML コピー
2. 左ペイン
   - ワークフロー基本設定
   - 入力項目管理
   - アクション管理
3. 右ペイン
   - 生成中の YAML プレビュー
   - 例示データの表示

### 4.2 主要コンポーネント

- `WorkflowBuilderApp`
- `WorkflowHeader`
- `WorkflowSettingsForm`
- `InputParameterEditor`
- `ActionList`
- `ActionEditor`
- `YamlPreviewPanel`

## 5. データモデル

```ts
type WorkflowStyle = "csharp" | "python";

type InputParam = {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  description: string;
};

type ActionModel = {
  id: string;
  kind: "SetVariable" | "SendActivity" | "If" | "InvokeAzureAgent" | "Question";
  displayName: string;
  variable?: string;
  value?: string;
  activityText?: string;
  condition?: string;
  agentName?: string;
  conversationId?: string;
};
```

## 6. 実装方針

### Phase 1: 仕様とモデル整理

- Microsoft Learn の YAML フォーマットを整理する
- C# と Python の差異を吸収できる中間モデルを設計する
- 生成ロジックの対象アクションを限定する

### Phase 2: UI 実装

- React コンポーネントでフォームを構築する
- 基本情報入力欄を追加する
- アクション追加ボタンを設置する
- アクション種別ごとに入力項目を切り替える

### Phase 3: YAML 生成

- `workflowToYaml(workflow, style)` を実装する
- フォーム入力を YAML に変換する
- 例として `SetVariable`, `SendActivity`, `If` を出力できるようにする

### Phase 4: 便利機能

- YAML をコピーするボタン
- サンプル定義の読み込み
- バリデーション警告の表示

### Phase 5: 改善フェーズ

- ループ / `ConditionGroup` / `Foreach` の追加
- ドラッグアンドドロップによるアクション並び替え
- JSON schema / YAML schema のチェック

## 7. MVP スコープ

MVP では以下を対象とする。

- 基本情報入力
- 入力パラメータ管理
- `SetVariable`
- `SendActivity`
- `If`
- `InvokeAzureAgent`
- `Question`
- YAML プレビューとコピー

## 8. 非機能観点

- エラーなしに生成可能な最小設計にする
- すべての入力を TypeScript の型で制御する
- 仕様変更に備えて YAML 生成ロジックを分離する

## 9. 受け入れ基準

- ワークフロー名、説明、入力パラメータを入力できる
- アクションを追加して YAML に変換できる
- C# と Python の表示形式を切り替えられる
- 生成 YAML をコピーできる
- `npm run build` でプロジェクトが正常にビルドできる

## 10. 次のステップ

1. サンプルワークフローの定義を増やす
2. `ConditionGroup` と `Foreach` の対応を追加する
3. 読み込んだ YAML を編集する「インポート」機能を実装する
4. エラーや注意表示を追加して、YAML 仕様と相違がないか検証する

## 11. 実装メモ

今回の実装では、初期段階として「フォーム入力 → YAML 生成」の簡易版を構築する。これにより、宣言型ワークフローの考え方を視覚的に理解しながら、将来的により高度なノード型エディタへ拡張しやすい設計にする。
