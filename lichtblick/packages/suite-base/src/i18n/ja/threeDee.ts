// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// 3D パネル関連の翻訳
export const threeDee = {
  // 共通
  color: "色",
  colorMode: "カラーモード",
  frame: "フレーム",
  lineWidth: "線の太さ",
  position: "位置",
  reset: "リセット",
  rotation: "回転",
  scale: "スケール",
  gradient: "グラデーション",
  type: "タイプ",
  topic: "トピック",

  // フレーム
  age: "経過時間",
  axisScale: "軸スケール",
  displayFrame: "フレームを表示",
  displayFrameHelp:
    "カメラを配置する座標フレームです。カメラの位置と向きは、このフレームの原点を基準にします。",
  editable: "編集可能",
  enablePreloading: "プリロードを有効化",
  fixed: "固定",
  followMode: "追従モード",
  followModeHelp: "再生中に表示フレームを追跡するかどうかを切り替えます。",
  frameNotFound: "フレーム '{{frameId}}' が見つかりません",
  hideAll: "すべて非表示",
  historySize: "履歴サイズ",
  labels: "ラベル",
  labelSize: "ラベルサイズ",
  lineColor: "線の色",
  noCoordinateFramesFound: "座標フレームが見つかりません",
  parent: "親",
  pose: "姿勢",
  rotationOffset: "回転オフセット",
  settings: "設定",
  showAll: "すべて表示",
  transforms: "変換",
  translation: "平行移動",
  translationOffset: "平行移動オフセット",

  // シーン
  background: "背景",
  debugPicking: "デバッグピッキング",
  ignoreColladaUpAxis: "COLLADA <up_axis> を無視",
  ignoreColladaUpAxisHelp: "COLLADA ファイルの <up_axis> タグを無視し、rviz の動作に合わせます",
  labelScale: "ラベルスケール",
  labelScaleHelp: "すべてのラベルに適用するスケール係数です",
  meshUpAxis: "メッシュの上方向軸",
  meshUpAxisHelp:
    "方向情報のないメッシュ（STL、OBJ など）を読み込む際に「上」として扱う軸を指定します",
  renderStats: "レンダリング統計",
  scene: "シーン",
  takeEffectAfterReboot: "この設定は再起動後に有効になります",
  YUp: "Y-up",
  ZUp: "Z-up",

  // カメラ
  distance: "距離",
  far: "遠",
  fovy: "FOV (Y軸)",
  near: "近",
  perspective: "パース",
  phi: "φ",
  planarProjectionFactor: "平面投影係数",
  syncCamera: "カメラを同期",
  syncCameraHelp: "この設定が有効な他のパネルとカメラを同期します。",
  target: "ターゲット",
  theta: "θ",
  view: "ビュー",

  // トピック
  topics: "トピック",

  // カスタムレイヤー
  addGrid: "グリッドを追加",
  addURDF: "URDF を追加",
  customLayers: "カスタムレイヤー",
  delete: "削除",
  divisions: "分割数",
  grid: "グリッド",
  size: "サイズ",

  // 画像注釈
  imageAnnotations: "画像注釈",
  resetView: "ビューをリセット",

  // 画像
  cameraInfo: "カメラ情報",

  // 占有グリッド
  colorModeCustom: "カスタム",
  colorModeRaw: "生データ",
  colorModeRvizCostmap: "コストマップ",
  colorModeRvizMap: "マップ",
  frameLock: "フレームロック",
  invalidColor: "無効な色",
  maxColor: "最大色",
  minColor: "最小色",
  unknownColor: "不明な色",

  // ポイント拡張ユーティリティ
  decayTime: "ディケイ時間",
  decayTimeDefaultZeroSeconds: "0秒",
  pointShape: "ポイント形状",
  pointShapeCircle: "円",
  pointShapeSquare: "正方形",
  pointSize: "ポイントサイズ",

  // カラーモード
  colorBy: "カラー基準",
  colorModeBgraPacked: "BGRA（パック）",
  colorModeBgrPacked: "BGR（パック）",
  colorModeColorMap: "カラーマップ",
  colorModeFlat: "フラット",
  colorModeRgbaSeparateFields: "RGBA（フィールド分離）",
  ColorFieldComputedDistance: "距離（自動）",
  flatColor: "フラットカラー",
  opacity: "不透明度",
  valueMax: "最大値",
  valueMin: "最小値",

  // マーカー
  selectionVariable: "選択変数",
  selectionVariableHelp: "マーカーを選択すると、このグローバル変数にマーカーIDが設定されます",
  showOutline: "アウトラインを表示",

  // ポーズ
  covariance: "共分散",
  covarianceColor: "共分散色",
  poseDisplayTypeArrow: "矢印",
  poseDisplayTypeAxis: "軸",
  poseDisplayTypeLine: "線",

  // パブリッシュ
  publish: "パブリッシュ",
  publishTopicHelp: "パブリッシュ先のトピック",
  publishTypeHelp: "シーン上でクリックした際にパブリッシュするメッセージタイプ",
  publishTypePoint: "ポイント（geometry_msgs/Point）",
  publishTypePose: "ポーズ（geometry_msgs/PoseStamped）",
  publishTypePoseEstimate: "ポーズ推定（geometry_msgs/PoseWithCovarianceStamped）",
  thetaDeviation: "θ偏差",
  thetaDeviationHelp: "ポーズ推定時にパブリッシュするθの標準偏差",
  xDeviation: "X偏差",
  xDeviationHelp: "ポーズ推定時にパブリッシュするXの標準偏差",
  yDeviation: "Y偏差",
  yDeviationHelp: "ポーズ推定時にパブリッシュするYの標準偏差",

  // HUD アイテムと空状態
  noImageTopicsAvailable: "利用可能な画像トピックがありません。",
  imageTopicDNE: "画像トピックが存在しません。",
  calibrationTopicDNE: "キャリブレーショントピックが存在しません。",
  imageAndCalibrationDNE: "画像とキャリブレーショントピックが存在しません。",
  waitingForCalibrationAndImages: "メッセージを待機中…",
  waitingForCalibration: "キャリブレーションメッセージを待機中…",
  waitingForImages: "画像メッセージを待機中…",
  waitingForSyncAnnotations: "同期注釈を待機中…",
};
