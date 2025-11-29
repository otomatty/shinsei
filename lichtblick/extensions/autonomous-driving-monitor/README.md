# Autonomous Driving Monitor Extension for Lichtblick

Real-time visualization tools for autonomous driving systems in Lichtblick.

## Overview

This extension provides specialized panels for monitoring and visualizing autonomous vehicle data:

1. **Vehicle Status Monitor** - Real-time vehicle telemetry display
2. **Traffic Light Recognition** - Traffic light detection and state visualization
3. **Obstacle Detection Visualizer** - 2D bird's-eye view of detected obstacles
4. **Demo Data Generator** - Information panel for testing

## Features

### Vehicle Status Monitor
- Speed and RPM gauges with analog display
- Battery level indicator
- Gear position display (P/R/N/D/S)
- Turn signal status
- Warning indicators (engine, battery, temperature)

### Traffic Light Recognition
- Visual representation of detected traffic lights
- State display (red/yellow/green/arrows)
- Confidence level indicator
- Distance to traffic light
- Optional countdown timer

### Obstacle Detection Visualizer
- 2D top-down view with configurable range (10m/30m/50m/100m)
- Color-coded obstacle types (car, pedestrian, bicycle, truck)
- Velocity vectors for moving objects
- Time-to-collision (TTC) warnings
- Real-time obstacle list with details

## Installation

### Development Mode

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Install locally in Lichtblick:
   ```bash
   npm run local-install
   ```

### Production Installation

1. Package the extension:
   ```bash
   npm run package
   ```
2. Open the generated `.foxe` file in Lichtblick

## Required Topics

The panels subscribe to the following ROS/ROS2 topics:

| Topic | Message Type | Description |
|-------|--------------|-------------|
| `/vehicle/status` | VehicleStatus | Vehicle telemetry data |
| `/perception/traffic_lights` | TrafficLightArray | Detected traffic lights |
| `/perception/obstacles` | ObstacleArray | Detected obstacles |

## Message Schemas

### VehicleStatus
```typescript
{
  speed: number;          // km/h
  rpm: number;           // Engine RPM
  battery: number;       // Battery percentage (0-100)
  gear: string;          // P/R/N/D/S
  turnSignal: string;    // left/right/hazard/off
  warnings: {
    engine: boolean;
    battery: boolean;
    temperature: boolean;
  };
  timestamp: number;
}
```

### TrafficLightArray
```typescript
{
  lights: Array<{
    id: string;
    state: string;        // red/yellow/green/arrow_*
    confidence: number;   // 0-1
    distance: number;     // meters
    timeRemaining?: number; // seconds
    position: { x, y, z };
    timestamp: number;
  }>;
  cameraId: string;
}
```

### ObstacleArray
```typescript
{
  obstacles: Array<{
    id: string;
    type: string;         // car/pedestrian/bicycle/truck/unknown
    position: { x, y, z };
    velocity: { x, y };
    dimensions: { length, width, height };
    confidence: number;   // 0-1
    ttc?: number;        // Time to collision (seconds)
    timestamp: number;
  }>;
  sensorType: string;    // lidar/radar/camera/fusion
}
```

## Development

### Project Structure
```
autonomous-driving-monitor/
├── src/
│   ├── index.ts              # Extension entry point
│   ├── types.ts              # TypeScript type definitions
│   └── panels/
│       ├── VehicleStatusPanel.tsx
│       ├── TrafficLightPanel.tsx
│       ├── ObstacleDetectionPanel.tsx
│       └── DemoDataGeneratorPanel.tsx
├── package.json
├── tsconfig.json
└── README.md
```

### Building
```bash
# Development build with watch mode
npm run build -- --watch

# Production build
npm run build -- --mode production

# Lint check
npm run lint

# Fix lint issues
npm run lint:fix
```

### Testing
1. Load the extension in Lichtblick
2. Add panels to your layout from the panel menu
3. Connect to a data source providing the required topics
4. Use sample ROS bag files or live ROS connections

## Customization

The panels can be customized through Lichtblick's panel settings:
- Adjust update rates
- Change color themes
- Configure display units
- Set alert thresholds

## Compatibility

- Lichtblick Suite 1.x
- React 18.x
- TypeScript 5.x
- Supports both ROS1 and ROS2 message formats

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Acknowledgments

Built with [Lichtblick Suite](https://github.com/lichtblick-suite/lichtblick) extension framework.