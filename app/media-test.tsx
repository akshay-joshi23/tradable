import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { AudioSession } from "@livekit/react-native";
import { MediaStream, RTCView } from "@livekit/react-native-webrtc";

import { Screen } from "../components/Screen";

/**
 * Standalone media test - no LiveKit. Uses the same WebRTC getUserMedia
 * that LiveKit uses. Tap "Start" to request camera+mic (user gesture required on iOS).
 */
export default function MediaTestScreen() {
  const router = useRouter();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startMedia = useCallback(
    async (opts: { video: boolean; audio: boolean }) => {
      if (streamRef.current) return;
      setError(null);
      setLoading(true);
      try {
        await AudioSession.startAudioSession();
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: opts.video,
          audio: opts.audio,
        });
        streamRef.current = mediaStream;
        setStream(mediaStream);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    AudioSession.stopAudioSession();
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  if (error) {
    return (
      <Screen>
        <Text variant="headlineSmall">Media test failed</Text>
        <Text style={[styles.error, { marginTop: 8 }]}>{error}</Text>
        <Text style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
          If this happens on your phone, it&apos;s a code/permission issue.
        </Text>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Back
        </Button>
      </Screen>
    );
  }

  if (!stream) {
    return (
      <Screen>
        <Text variant="headlineSmall">Media test (no LiveKit)</Text>
        <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Tap to test. Grant permissions when prompted. Try one at a time if it crashes.
        </Text>
        <Button
          mode="contained"
          onPress={() => startMedia({ video: true, audio: true })}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 24 }}
        >
          Camera + mic
        </Button>
        <Button
          mode="outlined"
          onPress={() => startMedia({ video: true, audio: false })}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          Video only
        </Button>
        <Button
          mode="outlined"
          onPress={() => startMedia({ video: false, audio: true })}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          Audio only
        </Button>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Back
        </Button>
      </Screen>
    );
  }

  const hasVideo = stream.getVideoTracks().length > 0;

  return (
    <Screen>
      <Text variant="headlineSmall">Media test (no LiveKit)</Text>
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        {hasVideo ? "Camera works." : "Audio only—no video to show."} LiveKit should work too.
      </Text>
      {hasVideo ? (
        <View style={styles.videoContainer}>
          <RTCView
            streamURL={stream.toURL()}
            style={styles.video}
            objectFit="cover"
          />
        </View>
      ) : (
        <View style={[styles.videoContainer, { justifyContent: "center", alignItems: "center" }]}>
          <Text>✓ Mic active</Text>
        </View>
      )}
      <Text style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        ✓ {hasVideo ? "Camera and mic" : "Mic"} active
      </Text>
      <Button mode="outlined" onPress={stopMedia} style={{ marginTop: 16 }}>
        Stop
      </Button>
      <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 8 }}>
        Back
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "red",
  },
  videoContainer: {
    marginTop: 24,
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#111",
    borderRadius: 8,
    overflow: "hidden",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
