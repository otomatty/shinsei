// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

/**
 * @fileoverview ROS/RViz メッセージ型定義
 *
 * このファイルは、ROS (Robot Operating System) およびRViz (ROS Visualization) で使用される
 * 全てのメッセージ型を定義します。これらの型定義は、ロボットデータの可視化、
 * 3Dマーカーの表示、ポイントクラウドの処理などに使用されます。
 *
 * 主な型カテゴリ:
 * - 基本幾何型 (Point, Orientation, Scale, Color)
 * - マーカー型 (Arrow, Cube, Sphere, Line, Text, Mesh等)
 * - センサーデータ型 (PointCloud2, VelodyneScan)
 * - 画像マーカー型 (ImageMarker, ImageMarkerArray)
 *
 * 参考: http://wiki.ros.org/rviz/DisplayTypes
 */

// All message types supported by Rviz
// http://wiki.ros.org/rviz/DisplayTypes

import { Time } from "@lichtblick/rostime";

/**
 * 3D空間の点を表すミュータブル型
 *
 * @description 3D座標系における位置を表現します。
 * ロボティクスでは通常、右手座標系を使用します。
 */
export type MutablePoint = {
  /** X座標 (前方向、メートル単位) */
  x: number;
  /** Y座標 (左方向、メートル単位) */
  y: number;
  /** Z座標 (上方向、メートル単位) */
  z: number;
};

/**
 * 3D空間の点を表すイミュータブル型
 *
 * @description MutablePointの読み取り専用版。
 * 不変性を保証することで、データの整合性を保ちます。
 */
export type Point = Readonly<MutablePoint>;

/**
 * 複数の3D点の配列型
 *
 * @description 線分、多角形、点群などの複合的な幾何形状を表現するために使用。
 */
type Points = readonly Point[];

/**
 * 2D平面の点を表すミュータブル型
 *
 * @description 画像座標や平面的な位置を表現します。
 * 通常、ピクセル座標系またはメートル座標系で使用されます。
 */
export type MutablePoint2D = {
  /** X座標 (水平方向) */
  x: number;
  /** Y座標 (垂直方向) */
  y: number;
};

/**
 * 2D平面の点を表すイミュータブル型
 *
 * @description MutablePoint2Dの読み取り専用版。
 */
export type Point2D = Readonly<MutablePoint2D>;

/**
 * ROSメッセージの標準ヘッダー
 *
 * @description 全てのROSメッセージに含まれる共通ヘッダー情報。
 * タイムスタンプ、フレームID、シーケンス番号を含みます。
 */
export type Header = Readonly<{
  /** 座標フレームID (例: "base_link", "map", "odom") */
  frame_id: string;
  /** メッセージのタイムスタンプ */
  stamp: Time;
  /** メッセージのシーケンス番号 (順序管理用) */
  seq: number;
}>;

/**
 * ヘッダー付きメッセージの基底型
 *
 * @description ROSの標準的なメッセージ構造。
 * 時刻情報と座標フレーム情報を含みます。
 */
export type StampedMessage = Readonly<{
  /** 標準ROSヘッダー */
  header: Header;
}>;

/**
 * 時間間隔を表す型
 *
 * @description ROSのDuration型に対応。
 * Timeと同じ構造ですが、絶対時刻ではなく相対時間を表現します。
 */
type Duration = Time;

/**
 * 3D回転を表すクォータニオン (ミュータブル)
 *
 * @description 3D空間での回転を表現するクォータニオン。
 * 正規化されたクォータニオン (|q| = 1) である必要があります。
 */
type MutableOrientation = {
  /** X成分 (i成分) */
  x: number;
  /** Y成分 (j成分) */
  y: number;
  /** Z成分 (k成分) */
  z: number;
  /** W成分 (実数成分) */
  w: number;
};

/**
 * 3D空間でのスケール変換
 *
 * @description オブジェクトの各軸方向のスケール倍率を定義。
 * 通常、正の値を使用します。
 */
export type Scale = Readonly<{
  /** X軸方向のスケール倍率 */
  x: number;
  /** Y軸方向のスケール倍率 */
  y: number;
  /** Z軸方向のスケール倍率 */
  z: number;
}>;

/**
 * RGBA色空間での色表現
 *
 * @description 色とアルファ値を定義。
 * 各成分は通常0.0-1.0の範囲で指定されます。
 */
export type Color = Readonly<{
  /** 赤成分 (0.0-1.0) */
  r: number;
  /** 緑成分 (0.0-1.0) */
  g: number;
  /** 青成分 (0.0-1.0) */
  b: number;
  /** アルファ成分 (透明度、0.0-1.0) */
  a: number;
}>;

/**
 * 3D空間での位置と向きを表すポーズ (ミュータブル)
 *
 * @description ロボットやオブジェクトの3D空間での完全な状態を表現。
 * 位置 (translation) と向き (rotation) の組み合わせです。
 *
 * @note Deep mutability - 内部のpositionとorientationも変更可能
 */
export type MutablePose = {
  /** 3D位置 */
  position: MutablePoint;
  /** 3D向き (クォータニオン) */
  orientation: MutableOrientation;
};

/**
 * 複数の色の配列型
 *
 * @description 各頂点やポイントに個別の色を指定する際に使用。
 */
type Colors = readonly Color[];

/**
 * 全てのマーカー型の基底インターフェース
 *
 * @description RVizで表示される全ての3Dマーカーの共通プロパティ。
 * 位置、スケール、色、ライフタイムなどの基本的な可視化パラメータを定義します。
 */
export type BaseMarker = Readonly<
  StampedMessage & {
    /** 名前空間 - マーカーのグループ化に使用 */
    ns: string;
    /** マーカーの一意識別子 */
    id: string | number;
    /** マーカーアクション: 0=ADD, 1=MODIFY, 2=DELETE, 3=DELETE_ALL */
    action: 0 | 1 | 2 | 3;
    /** マーカーの位置と向き */
    pose: MutablePose;
    /** マーカーのスケール */
    scale: Scale;
    /** マーカーの色 (単色の場合) */
    color?: Color;
    /** マーカーの色配列 (多色の場合) */
    colors?: Colors;
    /** マーカーの表示時間 (0で永続表示) */
    lifetime?: Time;
    /** フレームロック - trueの場合、フレームと一緒に移動 */
    frame_locked: boolean;
    /** 複数点で構成されるマーカーの頂点 */
    points?: Point[];
    /** テキストマーカーの文字列 */
    text?: string;
    /** メッシュマーカーのリソースURI */
    mesh_resource?: string;
    /** メッシュの埋め込みマテリアル使用フラグ */
    mesh_use_embedded_materials?: boolean;
    /** プリミティブ形状の種類 */
    primitive?: string;
    /** 追加のメタデータ */
    metadata?: Readonly<Record<string, unknown>>;
  }
>;

/**
 * 複数点を持つマーカーの共通インターフェース
 *
 * @description 線分、多角形、点群などの複合形状マーカーで使用。
 */
type MultiPointMarker = Readonly<{
  /** マーカーを構成する点の配列 */
  points: Points;
  /** 各点の色 (省略時は単色) */
  colors?: Colors;
}>;

/**
 * 矢印マーカーのサイズパラメータ
 *
 * @description 矢印の軸と頭部のサイズを詳細に制御。
 */
type ArrowSize = Readonly<{
  /** 軸の長さ (省略時は自動計算) */
  shaftLength?: number;
  /** 軸の太さ */
  shaftWidth: number;
  /** 矢印頭部の長さ */
  headLength: number;
  /** 矢印頭部の幅 */
  headWidth: number;
}>;

/**
 * 矢印マーカー (type: 0)
 *
 * @description 方向や力を表現するための矢印。
 * ベクトル場の可視化や、ロボットの移動方向表示に使用。
 */
export type ArrowMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 0 (ARROW) */
    type: 0;
    /** 矢印の始点と終点 (2点で線分を定義) */
    points?: Points;
    /** 矢印のサイズパラメータ (geometry_msgs/PoseStamped用) */
    size?: ArrowSize;
  }
>;

/**
 * 立方体マーカー (type: 1)
 *
 * @description 3D空間での立方体オブジェクト。
 * 障害物や境界ボックスの表示に使用。
 */
export type CubeMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 1 (CUBE) */
    type: 1;
  }
>;

/**
 * 球体マーカー (type: 2)
 *
 * @description 3D空間での球体オブジェクト。
 * ロボットの位置や検出対象の表示に使用。
 */
export type SphereMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 2 (SPHERE) */
    type: 2;
  }
>;

/**
 * 円柱マーカー (type: 3)
 *
 * @description 3D空間での円柱オブジェクト。
 * 柱状の障害物や円筒形オブジェクトの表示に使用。
 */
export type CylinderMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 3 (CYLINDER) */
    type: 3;
  }
>;

/**
 * 線ストリップマーカー (type: 4)
 *
 * @description 連続する線分で構成される経路やトレース。
 * ロボットの軌跡や計画経路の表示に使用。
 */
export type LineStripMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** 線が閉じているかどうか (最後の点を最初の点に接続) */
      closed?: boolean;
      /** マーカータイプ: 4 (LINE_STRIP) */
      type: 4;
    }
>;

/**
 * 線リストマーカー (type: 5)
 *
 * @description 独立した線分の集合。
 * 点群間の接続や、グリッドの表示に使用。
 */
export type LineListMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 5 (LINE_LIST) */
      type: 5;
    }
>;

/**
 * 立方体リストマーカー (type: 6)
 *
 * @description 複数の立方体の集合。
 * ボクセルグリッドや占有格子の表示に使用。
 */
export type CubeListMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 6 (CUBE_LIST) */
      type: 6;
    }
>;

/**
 * 球体リストマーカー (type: 7)
 *
 * @description 複数の球体の集合。
 * 粒子フィルタや点群の表示に使用。
 */
export type SphereListMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 7 (SPHERE_LIST) */
      type: 7;
    }
>;

/**
 * 点群マーカー (type: 8)
 *
 * @description 3D点の集合。
 * LiDARデータや特徴点の表示に使用。
 */
export type PointsMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 8 (POINTS) */
      type: 8;
    }
>;

/**
 * テキストマーカー (type: 9)
 *
 * @description 3D空間でのテキスト表示。
 * ラベルや状態情報の表示に使用。
 */
export type TextMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 9 (TEXT_VIEW_FACING) */
    type: 9;
    /** 表示するテキスト */
    text: string;
  }
>;

/**
 * メッシュマーカー (type: 10)
 *
 * @description 3Dメッシュモデルの表示。
 * 複雑な形状やロボットモデルの表示に使用。
 */
export type MeshMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 10 (MESH_RESOURCE) */
    type: 10;
    /** メッシュリソースのURI (例: "package://robot_description/meshes/base.dae") */
    mesh_resource: string;
    /** 埋め込みマテリアルの使用フラグ */
    mesh_use_embedded_materials: boolean;
  }
>;

/**
 * 三角形リストマーカー (type: 11)
 *
 * @description 三角形の集合で構成される複雑な形状。
 * カスタム3D形状の表示に使用。
 */
export type TriangleListMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 11 (TRIANGLE_LIST) */
      type: 11;
    }
>;

/**
 * インスタンス化線リストマーカー (type: 108)
 *
 * @description 高性能な線分表示のための拡張マーカー。
 * 大量の線分を効率的に描画する際に使用。
 */
export type InstancedLineListMarker = Readonly<
  BaseMarker &
    MultiPointMarker & {
      /** マーカータイプ: 108 (INSTANCED_LINE_LIST) */
      type: 108;
      /** 各インスタンスのメタデータ */
      metadataByIndex?: readonly Readonly<unknown[]>[];
      /** スケール不変フラグ - trueの場合、ズームしても線の太さが変わらない */
      scaleInvariant?: boolean;
    }
>;

/**
 * 色マーカー (type: 110)
 *
 * @description 色情報のみを持つマーカー。
 * 他のマーカーとの組み合わせで使用。
 */
export type ColorMarker = Readonly<
  BaseMarker & {
    /** マーカータイプ: 110 (COLOR) */
    type: 110;
  }
>;

/**
 * 全てのマーカー型の統合型
 *
 * @description RVizで表示可能な全てのマーカー型のユニオン型。
 * マーカーの種類に応じて適切な型が選択されます。
 */
export type Marker =
  | ArrowMarker
  | CubeMarker
  | CubeListMarker
  | SphereMarker
  | SphereListMarker
  | CylinderMarker
  | LineStripMarker
  | LineListMarker
  | PointsMarker
  | TextMarker
  | MeshMarker
  | TriangleListMarker
  | InstancedLineListMarker
  | ColorMarker;

/**
 * マーカー配列
 *
 * @description 複数のマーカーを一度に送信するためのコンテナ。
 * 効率的なバッチ処理と一貫性のある更新を可能にします。
 */
export type MarkerArray = Readonly<{
  /** マーカーの配列 */
  markers: readonly Marker[];
}>;

/**
 * 点群データのフィールド定義
 *
 * @description PointCloud2メッセージの各フィールドの構造を定義。
 * 位置、色、強度などの情報を含む点群データの解釈に使用。
 */
export type PointField = Readonly<{
  /** フィールド名 (例: "x", "y", "z", "rgb", "intensity") */
  name: string;
  /** バイト単位でのフィールドオフセット */
  offset: number;
  /** データ型 (1=INT8, 2=UINT8, 3=INT16, 4=UINT16, 5=INT32, 6=UINT32, 7=FLOAT32, 8=FLOAT64) */
  datatype: number;
  /** 要素数 (通常は1、配列の場合は配列サイズ) */
  count: number;
}>;

/**
 * 点群データ (PointCloud2)
 *
 * @description ROS標準の点群データ形式。
 * LiDAR、RGB-Dカメラ、ステレオカメラなどから取得される3D点群データを表現。
 *
 * @note 高密度の点群データを効率的に格納・転送するための形式
 */
export type PointCloud2 = StampedMessage & {
  /** 点群データのフィールド定義 */
  fields: readonly PointField[];
  /** 点群の高さ (組織化点群の場合、非組織化の場合は1) */
  height: number;
  /** 点群の幅 (組織化点群の場合、非組織化の場合は点数) */
  width: number;
  /** エンディアン (true=big-endian, false=little-endian) */
  is_bigendian: boolean;
  /** 1点あたりのバイト数 */
  point_step: number;
  /** 1行あたりのバイト数 */
  row_step: number;
  /** 点群の生データ */
  data: Uint8Array;
  /** 密度フラグ (true=欠損点なし, false=欠損点あり) */
  is_dense: boolean | number;
  /** シーンビルダーによって追加される型情報 */
  type: 102;
  /** シーンビルダーによって追加されるポーズ情報 */
  pose?: MutablePose;
};

/**
 * Velodyneパケットデータ
 *
 * @description Velodyne LiDARの生パケットデータ。
 * 通常1206バイトの固定サイズデータを含みます。
 */
export type VelodynePacket = Readonly<{
  /** パケットのタイムスタンプ */
  stamp: Time;
  /** パケットの生データ (1206バイト) */
  data: Uint8Array;
}>;

/**
 * Velodyneスキャンデータ
 *
 * @description 複数のVelodyneパケットから構成される1回転分のスキャンデータ。
 * 通常、1回転につき数百のパケットが含まれます。
 */
export type VelodyneScan = Readonly<
  StampedMessage & {
    /** スキャンを構成するパケット配列 */
    packets: VelodynePacket[];
  }
>;

/**
 * 画像マーカーの種類
 *
 * @description 画像上に描画可能なマーカーの種類を定義。
 * 2D画像での注釈や解析結果の表示に使用。
 */
export enum ImageMarkerType {
  /** 円形マーカー */
  CIRCLE = 0,
  /** 連続線分マーカー */
  LINE_STRIP = 1,
  /** 独立線分マーカー */
  LINE_LIST = 2,
  /** 多角形マーカー */
  POLYGON = 3,
  /** 点マーカー */
  POINTS = 4,
  /** テキストマーカー (標準仕様の拡張) */
  TEXT = 5,
}

/**
 * 画像マーカーのアクション
 *
 * @description 画像マーカーに対して実行するアクション。
 */
export enum ImageMarkerAction {
  /** マーカーを追加 */
  ADD = 0,
  /** マーカーを削除 */
  REMOVE = 1,
}

/**
 * 画像マーカー
 *
 * @description 2D画像上に描画されるマーカー。
 * カメラ画像での物体検出結果や注釈の表示に使用。
 *
 * @note textフィールドは標準仕様の拡張機能
 */
export type ImageMarker = Readonly<{
  /** 標準ROSヘッダー */
  header: Header;
  /** 名前空間 */
  ns: string;
  /** マーカーID */
  id: number;
  /** マーカーの種類 */
  type: ImageMarkerType;
  /** 実行するアクション */
  action: ImageMarkerAction;
  /** マーカーの位置 (画像座標) */
  position: Point;
  /** マーカーのスケール */
  scale: number;
  /** 輪郭の色 */
  outline_color: Color;
  /** 塗りつぶしフラグ */
  filled: boolean;
  /** 塗りつぶしの色 */
  fill_color: Color;
  /** マーカーの表示時間 */
  lifetime: Duration;
  /** マーカーを構成する点群 */
  points: Points;
  /** 各点の輪郭色 */
  outline_colors: Colors;
  /** テキスト内容 (標準仕様の拡張) */
  text?: { data: string };
}>;

/**
 * 画像マーカー配列
 *
 * @description 複数の画像マーカーを一度に送信するためのコンテナ。
 * 効率的なバッチ処理を可能にします。
 */
export type ImageMarkerArray = Readonly<{
  /** 画像マーカーの配列 */
  markers: ImageMarker[];
}>;
