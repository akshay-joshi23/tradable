/**
 * Entry point. registerGlobals() MUST run first so WebRTC globals
 * (navigator.mediaDevices, etc.) exist before any LiveKit/WebRTC code runs.
 */
import { registerGlobals } from "@livekit/react-native";
registerGlobals();

import "expo-router/entry";
