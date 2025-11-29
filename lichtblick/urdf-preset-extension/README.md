# URDF Preset Extension

A [Lichtblick](https://lichtblick.org/) extension that automatically provides preset URDF robot models to the 3D panel via MessageConverter functionality, without requiring UI changes.

## Overview

This extension converts `custom_robot/RobotConfig` messages to `std_msgs/String` containing URDF content, enabling automatic robot model display in Lichtblick's 3D visualization panel.

### Key Features

- **Preset Robot Models**: Predefined URDF models for common robot types
- **MessageConverter Integration**: Seamless conversion without 3D panel modifications
- **Frame ID Transformations**: Automatic prefix application for multi-robot scenarios
- **HTTP Caching**: Efficient URDF content retrieval and caching (5-minute expiration)
- **Fallback System**: Graceful degradation to default models on errors
- **Real-time Statistics**: Performance monitoring and error tracking

### Supported Preset Models

- `robot_a`: 6-DOF Industrial Manipulator Arm
- `robot_b`: Differential Drive Mobile Platform
- `robot_c`: Bipedal Humanoid Research Robot
- `default`: Simple Fallback Robot Model

## Architecture

```
custom_robot/RobotConfig → [MessageConverter] → std_msgs/String → 3D Panel
```

The extension registers a MessageConverter that:

1. Validates incoming `custom_robot/RobotConfig` messages
2. Determines the appropriate preset model based on `robot_id`
3. Fetches URDF content (with caching)
4. Applies frame ID transformations if specified
5. Outputs `std_msgs/String` with URDF data for 3D visualization

## Usage

### 1. Message Format

Send `custom_robot/RobotConfig` messages to trigger URDF loading:

```json
{
  "robot_id": "robot_a",
  "name": "Production Robot",
  "urdf_url": "",
  "frame_id": "robot1",
  "source": "preset",
  "timestamp": {
    "sec": 1635123456,
    "nanosec": 789000000
  }
}
```

### 2. ROS Example

```python
#!/usr/bin/env python3
import rospy
from std_msgs.msg import String
import json

def publish_robot_config():
    rospy.init_node('robot_config_publisher')
    pub = rospy.Publisher('/robot_config', String, queue_size=1)

    config = {
        "robot_id": "robot_a",
        "name": "Industrial Arm",
        "urdf_url": "",
        "frame_id": "robot1",
        "source": "preset"
    }

    rate = rospy.Rate(1)  # 1Hz
    while not rospy.is_shutdown():
        msg = String()
        msg.data = json.dumps(config)
        pub.publish(msg)
        rate.sleep()

if __name__ == '__main__':
    publish_robot_config()
```

### 3. Expected Output

The extension automatically converts the message to `std_msgs/String` on the `/robot_description` topic, which the 3D panel consumes to display the robot model.

## Develop

Extension development uses the `npm` package manager to install development dependencies and run build scripts.

To install extension dependencies, run `npm` from the root of the extension package.

```sh
npm install
```

To build and install the extension into your local Lichtblick desktop app, run:

```sh
npm run local-install
```

Open the Lichtblick desktop (or `ctrl-R` to refresh if it is already open). Your extension is installed and available within the app.

## Testing

### Unit Tests

```sh
npm test
```

### Integration Testing

1. Start Lichtblick with the extension installed
2. Use the ROS example above to publish `custom_robot/RobotConfig` messages
3. Open the 3D panel and verify robot models appear automatically
4. Check the console for conversion statistics and error logs

### Debugging

Enable extension debugging in Lichtblick:

1. Open Developer Tools (View → Toggle Developer Tools)
2. Look for `[URDF Preset Extension]` log messages
3. Monitor conversion statistics and cache performance

## Configuration

### Adding Custom Presets

Edit `src/models/presetModels.ts` to add new robot models:

```typescript
export const PRESET_MODELS: Record<PresetModelType, PresetModel> = {
  // ... existing models
  my_robot: {
    id: "my_robot",
    name: "My Custom Robot",
    description: "Custom robot description",
    url: "https://example.com/path/to/robot.urdf",
    category: "manipulator",
    default_frame_id: "my_robot_base_link",
    enabled: true,
    metadata: {
      author: "Your Name",
      version: "1.0.0",
      license: "MIT",
      tags: ["custom", "example"],
    },
  },
};
```

### Cache Settings

Modify cache behavior in `src/models/ModelManager.ts`:

```typescript
class ModelManager {
  private readonly cacheExpiration = 5 * 60 * 1000; // 5 minutes
  private readonly requestTimeout = 10000; // 10 seconds
}
```

## Package

Extensions are packaged into `.foxe` files. These files contain the metadata (package.json) and the build code for the extension.

Before packaging, make sure to set `name`, `publisher`, `version`, and `description` fields in _package.json_. When ready to distribute the extension, run:

```sh
npm run package
```

This command will package the extension into a `.foxe` file in the local directory.

## Troubleshooting

### Common Issues

1. **Robot model not appearing in 3D panel**

   - Check that `/robot_config` topic is being published
   - Verify `robot_id` matches a valid preset in `presetModels.ts`
   - Enable developer console to see conversion logs

2. **URDF loading failures**

   - Check network connectivity for external URDF URLs
   - Verify URDF file format is valid XML
   - Monitor cache statistics for timeout issues

3. **Frame ID conflicts**
   - Use unique `frame_id` values for multiple robots
   - Check TF tree for naming conflicts
   - Verify frame transformations are applied correctly

### Performance Monitoring

The extension logs statistics every minute:

```
[UrdfPresetConverter] Statistics: {
  processed: 45,
  errors: 0,
  errorRate: "0%",
  cache: { size: 3, entries: 3 }
}
```

## API Reference

### Message Schema: `custom_robot/RobotConfig`

| Field        | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| `robot_id`   | string | ✅       | Preset model identifier                 |
| `name`       | string | ✅       | Display name for the robot              |
| `urdf_url`   | string | ✅       | URDF file URL (auto-filled for presets) |
| `frame_id`   | string | ❌       | Frame prefix for multi-robot scenarios  |
| `source`     | string | ❌       | Source type: "preset" or "custom"       |
| `timestamp`  | object | ❌       | ROS timestamp structure                 |
| `parameters` | object | ❌       | Additional configuration parameters     |

### Available Preset IDs

- `robot_a`: Industrial manipulator arm
- `robot_b`: Mobile platform with sensors
- `robot_c`: Humanoid research robot
- `default`: Simple fallback model

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-preset`
3. Add your preset model to `src/models/presetModels.ts`
4. Add corresponding tests in `src/__tests__/`
5. Update documentation
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Publish

You can publish the extension to the public registry or privately for your organization.
