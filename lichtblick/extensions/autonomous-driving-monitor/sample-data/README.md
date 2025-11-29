# テスト用サンプルデータ

このディレクトリには、Autonomous Driving Monitor extensionのテスト用サンプルデータファイルが含まれています。

## ファイル一覧

### 基本データ
- `autonomous_driving_test.jsonl` - 基本的な自動運転シナリオ（既存）
- `generate_test_data.py` - データ生成スクリプト（既存）

### 新規追加シナリオ

#### 1. emergency_scenario.jsonl
**緊急事態シナリオ**
- 歩行者の飛び出し
- 急ブレーキ状況
- ハザードランプ点滅
- エンジン警告

#### 2. night_driving.jsonl
**夜間運転シナリオ**
- 低照度環境
- 信頼度の低下
- バッテリー警告
- 認識困難な物体

#### 3. highway_scenario.jsonl
**高速道路シナリオ**
- 高速走行（120km/h）
- 大型トラック
- 車線変更
- レーダーセンサーデータ

#### 4. urban_intersection.jsonl
**市街地交差点シナリオ**
- 複数の信号機
- 歩行者横断
- 自転車レーン
- 配送車両

#### 5. parking_scenario.jsonl
**駐車場シナリオ**
- バック駐車
- 狭いスペース
- 静的障害物
- LiDARセンサーデータ

#### 6. weather_conditions.jsonl
**悪天候シナリオ**
- 雨天走行
- 視界不良
- 水たまり
- 認識精度低下

## データ形式

各ファイルはJSONL形式で、以下のトピックを含みます：

- `/vehicle/status` - 車両状態（速度、RPM、バッテリー、ギア、ウィンカー、警告）
- `/perception/traffic_lights` - 信号機認識データ
- `/perception/obstacles` - 障害物認識データ

## 使用方法

1. Lichtblickを起動
2. 任意のJSONLファイルを読み込み
3. Autonomous Driving Monitor extensionの各パネルでデータを可視化

## テストシナリオの特徴

| シナリオ | 主な特徴 | テスト項目 |
|---------|---------|-----------|
| Emergency | 緊急事態、TTC短縮 | 危険検知、警告表示 |
| Night | 低信頼度、認識困難 | 低照度対応、不確実性表示 |
| Highway | 高速、複数車両 | 高速対応、車線変更 |
| Urban | 複雑交差点、多種車両 | 複合状況、信号連携 |
| Parking | 低速、精密制御 | 精密測距、静的物体 |
| Weather | 悪条件、視界不良 | 環境適応、信頼度変動 |

## カスタマイズ

`generate_test_data.py`を参考に、独自のテストシナリオを作成できます。