# MessagePathInput コンポーネント

## 📋 概要

`MessagePathInput`は、ROSメッセージパスの入力を支援する高機能な自動補完付き入力フィールドコンポーネントです。ROSトピックとメッセージフィールドへのパスを直感的に入力できるよう設計されており、Lichtblickアプリケーションにおけるデータ選択の中核機能を担います。

## 🎯 主な機能

### 自動補完機能

1. **トピック名補完**

   - 利用可能なROSトピック名を自動補完
   - トピック名の引用符処理を自動化

2. **メッセージフィールドパス補完**

   - メッセージ構造に基づいたフィールドパス補完
   - 配列アクセス（`[0]`, `[:]`）の提案
   - ネストされたフィールドへの深いアクセス

3. **フィルター条件補完**

   - プリミティブフィールドに対するフィルター条件の提案
   - 比較演算子（`==`, `!=`, `>`, `>=`, `<`, `<=`）の自動挿入
   - 型に応じたサンプル値の提供

4. **グローバル変数補完**
   - 定義済みグローバル変数の補完
   - 未定義変数の検出とエラー表示

### 入力支援機能

- **スマートな文字入力**: `{` 入力時の自動 `}` 挿入
- **型制約**: 指定された型のみに候補を絞り込み
- **数学修飾子サポート**: `.@` 演算子の有効/無効制御
- **エラー検出**: 無効なパスや未対応機能の使用を検出

## 🔧 使用方法

### 基本的な使用例

```typescript
import MessagePathInput from "@lichtblick/suite-base/components/MessagePathSyntax/MessagePathInput";

function MyComponent() {
  const [path, setPath] = useState("/robot/pose.position.x");

  return (
    <MessagePathInput
      path={path}
      onChange={(newPath) => setPath(newPath)}
      placeholder="Enter message path..."
    />
  );
}
```

### 型制約付きの使用例

```typescript
function NumericFieldSelector() {
  const [path, setPath] = useState("");

  return (
    <MessagePathInput
      path={path}
      onChange={setPath}
      validTypes={["primitive", "float64", "int32"]}
      placeholder="Select numeric field..."
    />
  );
}
```

### 複数入力フィールドでの使用例

```typescript
function MultiplePathSelector() {
  const [paths, setPaths] = useState(["", "", ""]);

  const handlePathChange = (newPath: string, index?: number) => {
    if (index !== undefined) {
      const newPaths = [...paths];
      newPaths[index] = newPath;
      setPaths(newPaths);
    }
  };

  return (
    <div>
      {paths.map((path, index) => (
        <MessagePathInput
          key={index}
          path={path}
          index={index}
          onChange={handlePathChange}
          placeholder={`Path ${index + 1}...`}
        />
      ))}
    </div>
  );
}
```

### 数学修飾子を使用した例

```typescript
function MathModifierExample() {
  const [path, setPath] = useState("/sensor/data.value.@derivative");

  return (
    <MessagePathInput
      path={path}
      onChange={setPath}
      supportsMathModifiers={true}
      placeholder="Enter path with math modifier..."
    />
  );
}
```

## 📋 プロパティ

| プロパティ              | 型                                        | 必須 | デフォルト                    | 説明                                             |
| ----------------------- | ----------------------------------------- | ---- | ----------------------------- | ------------------------------------------------ |
| `path`                  | `string`                                  | ✅   | -                             | 入力されたパス文字列                             |
| `onChange`              | `(value: string, index?: number) => void` | ✅   | -                             | パス変更時のコールバック関数                     |
| `supportsMathModifiers` | `boolean`                                 | ❌   | `false`                       | 数学修飾子（.@演算子）をサポートするかどうか     |
| `index`                 | `number`                                  | ❌   | -                             | 複数の入力フィールドを区別するためのインデックス |
| `validTypes`            | `readonly string[]`                       | ❌   | -                             | 有効な型のリスト                                 |
| `noMultiSlices`         | `boolean`                                 | ❌   | `false`                       | 複数値スライス（[:]）を無効にするかどうか        |
| `placeholder`           | `string`                                  | ❌   | `"/some/topic.msgs[0].field"` | プレースホルダーテキスト                         |
| `inputStyle`            | `CSSProperties`                           | ❌   | -                             | 入力フィールドのカスタムスタイル                 |
| `disabled`              | `boolean`                                 | ❌   | `false`                       | 入力フィールドを無効にするかどうか               |
| `disableAutocomplete`   | `boolean`                                 | ❌   | `false`                       | 自動補完を無効にするかどうか                     |
| `readOnly`              | `boolean`                                 | ❌   | `false`                       | 読み取り専用にするかどうか                       |
| `prioritizedDatatype`   | `string`                                  | ❌   | -                             | 優先されるデータ型                               |
| `variant`               | `TextFieldProps["variant"]`               | ❌   | `"standard"`                  | Material-UIのTextFieldバリアント                 |

## 🔍 メッセージパス構文

### 基本構文要素

1. **トピック名**: `/topic_name`
2. **フィールドアクセス**: `.field_name`
3. **配列インデックス**: `[0]` または `[:]`
4. **フィルター条件**: `{field==value}`
5. **グローバル変数**: `$variable_name`
6. **数学修飾子**: `.@derivative`

### 構文例

```
/robot/pose.position.x                    # 基本的なフィールドアクセス
/sensor/data.values[0]                    # 配列の特定要素
/sensor/data.values[:]                    # 配列全体
/diagnostics.status[0]{level==1}          # フィルター付き配列アクセス
/tf.transforms[:]{child_frame_id=="base"} # 文字列フィルター
/robot/joint_states.position[$joint_idx]  # グローバル変数使用
/sensor/data.value.@derivative            # 数学修飾子
```

## 🤖 自動補完の動作

### 1. トピック名補完

- **トリガー**: 入力が空、または `/` で始まる場合
- **候補**: 利用可能なROSトピック名
- **機能**:
  - 引用符が必要なトピック名の自動処理
  - 優先データ型に基づく並び替え

### 2. メッセージパス補完

- **トリガー**: 有効なトピック名の後に `.` が入力された場合
- **候補**: メッセージ構造に基づくフィールドパス
- **機能**:
  - ネストされたフィールドの深い探索
  - 配列アクセスの提案（`[0]`, `[:]`）
  - 型制約による候補の絞り込み

### 3. フィルター補完

- **トリガー**: `{` が入力された場合
- **候補**: プリミティブフィールドに対するフィルター条件
- **機能**:
  - 比較演算子の自動挿入
  - 型に応じたサンプル値の提供
  - 複数の比較演算子の提案

### 4. グローバル変数補完

- **トリガー**: 未定義の `$variable_name` が検出された場合
- **候補**: 定義済みグローバル変数
- **機能**:
  - 未定義変数の検出とエラー表示
  - 既存変数の候補提示

## 🔧 高度な機能

### 型制約

`validTypes` プロパティを使用して、特定の型のみを対象とした自動補完を行えます：

```typescript
// プリミティブ型のみ
validTypes={["primitive"]}

// 特定のROSプリミティブ型
validTypes={["float64", "int32"]}

// メッセージ型のみ
validTypes={["message"]}

// 配列型のみ
validTypes={["array"]}
```

### 数学修飾子

Plot パネルなどで使用される数学修飾子をサポート：

```typescript
// 微分値
"/sensor/data.value.@derivative";

// 絶対値
"/sensor/data.value.@abs";
```

### スライス制御

`noMultiSlices` プロパティで配列アクセスの種類を制御：

```typescript
// 複数値スライス無効（[0] のみ許可）
noMultiSlices={true}

// 複数値スライス有効（[:] も許可）
noMultiSlices={false}
```

## 📝 使用例とパターン

### 1. データ可視化パネル

```typescript
function PlotPanel() {
  const [yAxisPath, setYAxisPath] = useState("");

  return (
    <MessagePathInput
      path={yAxisPath}
      onChange={setYAxisPath}
      validTypes={["primitive", "float64", "int32"]}
      supportsMathModifiers={true}
      placeholder="Y-axis data path..."
    />
  );
}
```

### 2. 条件付きフィルタリング

```typescript
function ConditionalFilter() {
  const [filterPath, setFilterPath] = useState("");

  return (
    <MessagePathInput
      path={filterPath}
      onChange={setFilterPath}
      placeholder="Filter condition..."
      // フィルター条件の入力を促進
    />
  );
}
```

### 3. 配列データ選択

```typescript
function ArrayDataSelector() {
  const [arrayPath, setArrayPath] = useState("");

  return (
    <MessagePathInput
      path={arrayPath}
      onChange={setArrayPath}
      validTypes={["array"]}
      noMultiSlices={true}
      placeholder="Select array element..."
    />
  );
}
```

### 4. 複数データソース選択

```typescript
function MultiDataSourceSelector() {
  const [paths, setPaths] = useState(["", "", ""]);

  return (
    <div>
      {paths.map((path, index) => (
        <MessagePathInput
          key={index}
          path={path}
          index={index}
          onChange={(newPath, idx) => {
            const newPaths = [...paths];
            newPaths[idx!] = newPath;
            setPaths(newPaths);
          }}
          prioritizedDatatype="sensor_msgs/PointCloud2"
          placeholder={`Data source ${index + 1}...`}
        />
      ))}
    </div>
  );
}
```

## ⚠️ エラーハンドリング

### 一般的なエラー

1. **無効なメッセージパス**

   - 存在しないフィールドへのアクセス
   - 型不一致のアクセス

2. **未定義グローバル変数**

   - `$undefined_variable` の使用
   - 自動補完でエラー位置を表示

3. **サポートされていない数学修飾子**
   - `supportsMathModifiers={false}` 時の `.@` 使用

### エラー表示の条件

```typescript
// エラー状態の判定
const hasError =
  usesUnsupportedMathModifier ||
  (autocompleteType != undefined && !disableAutocomplete && path.length > 0);
```

## 🔧 内部実装の詳細

### 主要フック

- `useGlobalVariables()`: グローバル変数の管理
- `PanelAPI.useDataSourceInfo()`: データ型とトピック情報の取得
- `useMemo()`: 計算結果のメモ化による性能最適化

### 処理フロー

1. **入力解析**: `parseMessagePath()` でパスを構造化
2. **構造走査**: `traverseStructure()` で有効性を検証
3. **候補生成**: `messagePathsForStructure()` で自動補完候補を生成
4. **フィルタリング**: 型制約に基づく候補の絞り込み
5. **表示**: 自動補完UIでの候補提示

### 最適化戦略

- **メモ化**: 計算コストの高い処理結果をキャッシュ
- **遅延評価**: 必要時のみ候補を生成
- **インクリメンタル更新**: 入力変更時の差分更新

## 🔗 関連コンポーネント

### 依存関係

- `Autocomplete`: 自動補完UIの基盤
- `messagePathsForDatatype`: メッセージパス生成ロジック
- `useGlobalVariables`: グローバル変数管理
- `PanelAPI`: データソース情報の取得

### 使用されるパネル

- Plot パネル: データ可視化
- Raw Messages パネル: メッセージ表示
- State Transitions パネル: 状態遷移
- Table パネル: データテーブル

## 🚀 今後の拡張予定

1. **高度なフィルター構文**: 複雑な条件式のサポート
2. **型推論の改善**: より正確な型チェック
3. **パフォーマンス最適化**: 大規模データセットでの高速化
4. **カスタム修飾子**: ユーザー定義の数学演算子
5. **インテリセンス機能**: より詳細なヘルプとドキュメント表示

---

**最終更新**: 2025-01-02
**バージョン**: 1.0.0
**メンテナー**: Lichtblick Development Team
