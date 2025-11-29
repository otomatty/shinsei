// 車両状態データ構造
export interface VehicleStatus {
  speed: number;          // km/h
  rpm: number;           // 回転数
  battery: number;       // 0-100%
  gear: 'P' | 'R' | 'N' | 'D' | 'S';
  turnSignal: 'left' | 'right' | 'hazard' | 'off';
  warnings: {
    engine: boolean;
    battery: boolean;
    temperature: boolean;
  };
  timestamp: number;
}

// 信号機データ構造
export interface TrafficLight {
  id: string;
  state: 'red' | 'yellow' | 'green' | 'arrow_left' | 'arrow_right' | 'arrow_straight';
  confidence: number;    // 0-1
  distance: number;      // meters
  timeRemaining?: number; // seconds
  position: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
}

export interface TrafficLightArray {
  lights: TrafficLight[];
  cameraId: string;
}

// 障害物データ構造
export interface Obstacle {
  id: string;
  type: 'car' | 'pedestrian' | 'bicycle' | 'truck' | 'unknown';
  position: {
    x: number;
    y: number;
    z: number;
  };
  velocity: {
    x: number;
    y: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  confidence: number;
  ttc?: number; // Time to collision
  timestamp: number;
}

export interface ObstacleArray {
  obstacles: Obstacle[];
  sensorType: 'lidar' | 'radar' | 'camera' | 'fusion';
}