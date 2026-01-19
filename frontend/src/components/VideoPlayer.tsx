'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  hlsUrl: string;
  onError?: (error: string) => void;
  onStalled?: () => void;
}

export default function VideoPlayer({ hlsUrl, onError, onStalled }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS is supported
    if (Hls.isSupported()) {
      // Create HLS instance
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      // Bind to video element
      hls.attachMedia(video);

      // Handle media attached
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached');
        hls.loadSource(hlsUrl);
      });

      // Handle manifest parsed
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, starting playback');
        video.play().catch((error) => {
          console.error('Error starting playback:', error);
          onError?.('Failed to start video playback');
        });
      });

      // Handle errors
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover');
              hls.startLoad();
              onStalled?.();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              onError?.('Video playback error. Connection may be lost.');
              hls.destroy();
              break;
          }
        }
      });

      // Handle buffer stalling
      video.addEventListener('stalled', () => {
        console.warn('Video playback stalled');
        onStalled?.();
      });

      video.addEventListener('waiting', () => {
        console.warn('Video waiting for data');
      });

      video.addEventListener('playing', () => {
        console.log('Video playing');
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((error) => {
          console.error('Error starting playback:', error);
          onError?.('Failed to start video playback');
        });
      });

      video.addEventListener('error', () => {
        onError?.('Video playback error. Connection may be lost.');
      });
    } else {
      onError?.('HLS is not supported in this browser');
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [hlsUrl, onError, onStalled]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        className="video-element"
      />

      <style jsx>{`
        .video-player {
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .video-element {
          width: 100%;
          height: auto;
          display: block;
          max-height: 70vh;
        }
      `}</style>
    </div>
  );
}
