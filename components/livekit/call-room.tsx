"use client";

import "@livekit/components-styles";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { Button } from "@/components/ui/button";

type CallRoomProps = {
  callId: string;
  requestId: string;
  livekitUrl: string;
  isPro: boolean;
};

export function CallRoom({ callId, requestId, livekitUrl, isPro }: CallRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startCall = async () => {
      await fetch(`/api/calls/${callId}/start`, { method: "POST" });
    };

    const fetchToken = async () => {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Unable to fetch LiveKit token.");
        return;
      }

      setToken(payload.token);
    };

    startCall().catch(() => null);
    fetchToken().catch(() => null);
  }, [callId, requestId]);

  const handleEndCall = async () => {
    await fetch(`/api/calls/${callId}/end`, { method: "POST" });
    window.location.href = isPro ? `/pro/outcome/${callId}` : "/";
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!token) {
    return <p>Loading video room...</p>;
  }

  return (
    <div className="space-y-4">
      <LiveKitRoom token={token} serverUrl={livekitUrl} connect={true} data-lk-theme="default">
        <VideoConference />
      </LiveKitRoom>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleEndCall}>
          End call
        </Button>
      </div>
    </div>
  );
}
