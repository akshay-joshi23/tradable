import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/react-native";
import { ConnectionState, Track } from "livekit-client";

import { AuthGate } from "../../components/AuthGate";
import { Screen } from "../../components/Screen";
import { getLiveKitToken } from "../../lib/api";
import { useRole } from "../../lib/role";

class CallErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[CallErrorBoundary] Caught error:", error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

function EnableMediaAfterConnect() {
  const room = useRoomContext();
  const enabled = useRef(false);

  useEffect(() => {
    if (!room) return;
    const enable = async () => {
      if (enabled.current) return;
      enabled.current = true;
      try {
        await AudioSession.startAudioSession();
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
      } catch (e) {
        console.warn("[Call] Enable media failed:", e);
      }
    };
    if (room.state === ConnectionState.Connected) {
      enable();
    } else {
      room.on("connected", enable);
    }
    return () => {
      room.off("connected", enable);
      AudioSession.stopAudioSession();
    };
  }, [room]);

  return null;
}

function RoomView() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  return (
    <View style={styles.videoGrid}>
      {tracks
        .filter((t) => t?.publication?.trackSid)
        .map((track) => (
          <VideoTrack
            key={track.publication.trackSid}
            trackRef={track}
            style={styles.video}
          />
        ))}
    </View>
  );
}

function CallControls({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(false);

  const toggleMute = async () => {
    const next = !muted;
    try {
      await room?.localParticipant?.setMicrophoneEnabled(!next);
      setMuted(next);
    } catch (e) {
      console.warn("[Call] toggleMute failed:", e);
    }
  };

  return (
    <View style={styles.controls}>
      <Button mode="outlined" onPress={toggleMute}>
        {muted ? "Unmute" : "Mute"}
      </Button>
      <Button mode="contained" onPress={onLeave}>
        Leave
      </Button>
      <Text style={styles.participantText}>
        Participants: {(room?.remoteParticipants?.size ?? 0) + 1} (You: {localParticipant?.identity ?? "Guest"})
      </Text>
    </View>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useRole();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    const loadToken = async () => {
      setError(null);
      try {
        const nextToken = await getLiveKitToken(id);
        setToken(nextToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load LiveKit token.");
      }
    };
    loadToken();
  }, [id]);

  const livekitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;

  const handleLeave = () => {
    if (role === "pro") {
      router.replace(`/pro/outcome/${id}`);
    } else {
      router.replace(`/customer/request/${id}`);
    }
  };

  return (
    <AuthGate>
      <Screen>
        <Text variant="headlineSmall">Live call</Text>
        {error ? <Text style={{ marginTop: 8 }}>{error}</Text> : null}
        {!livekitUrl ? (
          <Text style={{ marginTop: 8, color: "red" }}>
            LiveKit URL is not configured. Check EXPO_PUBLIC_LIVEKIT_URL.
          </Text>
        ) : token ? (
          <>
            <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Camera and mic enable after connection.
            </Text>
            <View style={styles.room}>
            <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect
            video={false}
            audio={false}
            onConnected={() => console.log("[Call] LiveKit connected")}
            onDisconnected={handleLeave}
            onError={(err) => {
              console.error("[Call] LiveKit error:", err.message);
              setError(err.message);
            }}
          >
            <CallErrorBoundary
              fallback={(err) => (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: "red" }}>Call UI error: {err.message}</Text>
                </View>
              )}
            >
              <EnableMediaAfterConnect />
              <RoomView />
              <CallControls onLeave={handleLeave} />
            </CallErrorBoundary>
          </LiveKitRoom>
            </View>
          </>
        ) : (
          <Text style={{ marginTop: 16 }}>Connecting...</Text>
        )}
      </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  room: {
    flex: 1,
    marginTop: 16,
  },
  videoGrid: {
    flex: 1,
    flexDirection: "column",
    gap: 12,
  },
  video: {
    width: "100%",
    height: 220,
    backgroundColor: "#111",
  },
  controls: {
    marginTop: 16,
    gap: 12,
  },
  participantText: {
    marginTop: 8,
  },
});
