#!/usr/bin/env python3
"""
Generate test MCAP file for Autonomous Driving Monitor extension
"""

import json
import time
import math
from datetime import datetime

# Create JSON Lines format data file (simplified alternative to MCAP)
def generate_test_data():
    output_file = "autonomous_driving_test.jsonl"
    duration = 60  # 60 seconds of data
    frequency = 10  # 10Hz
    
    with open(output_file, 'w') as f:
        current_time = time.time()
        
        for i in range(duration * frequency):
            timestamp = current_time + (i / frequency)
            t = i / frequency
            
            # Vehicle Status Message
            vehicle_status = {
                "topic": "/vehicle/status",
                "timestamp": timestamp,
                "message": {
                    "speed": 50 + math.sin(t * 0.1) * 30,  # 20-80 km/h
                    "rpm": 2000 + math.sin(t * 0.2) * 1500,  # 500-3500 rpm
                    "battery": max(20, 100 - t * 0.5),  # Battery decreases
                    "gear": "D",
                    "turnSignal": "left" if (t % 20) < 5 else "off",
                    "warnings": {
                        "engine": False,
                        "battery": (100 - t * 0.5) < 25,
                        "temperature": False
                    },
                    "timestamp": timestamp * 1000  # Convert to milliseconds
                }
            }
            f.write(json.dumps(vehicle_status) + '\n')
            
            # Traffic Light Message
            traffic_light_state = "green" if (t % 30) < 10 else ("yellow" if (t % 30) < 20 else "red")
            traffic_lights = {
                "topic": "/perception/traffic_lights",
                "timestamp": timestamp,
                "message": {
                    "lights": [
                        {
                            "id": "TL001",
                            "state": traffic_light_state,
                            "confidence": 0.95,
                            "distance": max(5, 100 - t * 2),
                            "timeRemaining": 10 - (t % 10) if traffic_light_state != "red" else None,
                            "position": {"x": 0, "y": 100 - t * 2, "z": 5},
                            "timestamp": timestamp * 1000
                        }
                    ],
                    "cameraId": "front_camera"
                }
            }
            f.write(json.dumps(traffic_lights) + '\n')
            
            # Obstacles Message
            obstacles = {
                "topic": "/perception/obstacles",
                "timestamp": timestamp,
                "message": {
                    "obstacles": [
                        # Car in front
                        {
                            "id": "OBS001",
                            "type": "car",
                            "position": {
                                "x": 0,
                                "y": 20 + math.sin(t * 0.05) * 5,
                                "z": 0
                            },
                            "velocity": {"x": 0, "y": 0.5},
                            "dimensions": {"length": 4.5, "width": 2, "height": 1.5},
                            "confidence": 0.92,
                            "ttc": (20 + math.sin(t * 0.05) * 5) / 5,
                            "timestamp": timestamp * 1000
                        },
                        # Pedestrian
                        {
                            "id": "PED001",
                            "type": "pedestrian",
                            "position": {
                                "x": -10 + math.sin(t * 0.2) * 2,
                                "y": 15,
                                "z": 0
                            },
                            "velocity": {
                                "x": math.cos(t * 0.2) * 0.5,
                                "y": 0
                            },
                            "dimensions": {"length": 0.5, "width": 0.5, "height": 1.8},
                            "confidence": 0.85,
                            "timestamp": timestamp * 1000
                        }
                    ],
                    "sensorType": "fusion"
                }
            }
            
            # Add bicycle periodically
            if (t % 20) < 15:
                obstacles["message"]["obstacles"].append({
                    "id": "BIKE001",
                    "type": "bicycle",
                    "position": {
                        "x": 8,
                        "y": 10 + (t % 20) * 0.5,
                        "z": 0
                    },
                    "velocity": {"x": 0, "y": 1.5},
                    "dimensions": {"length": 1.8, "width": 0.6, "height": 1.2},
                    "confidence": 0.78,
                    "timestamp": timestamp * 1000
                })
            
            f.write(json.dumps(obstacles) + '\n')
    
    print(f"Generated {output_file} with {duration} seconds of test data at {frequency}Hz")
    print(f"Total messages: {duration * frequency * 3}")
    print("\nTo use in Lichtblick:")
    print("1. Open Lichtblick")
    print("2. Load this JSONL file as a data source")
    print("3. Add the Autonomous Driving Monitor panels")

if __name__ == "__main__":
    generate_test_data()