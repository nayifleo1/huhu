import { registerPlugin } from '@capacitor/core';

export interface ExoPlayerPlugin {
  play(options: {
    url: string;
    title?: string;
    headers?: Record<string, string>;
    subtitles?: Array<{
      url: string;
      language: string;
    }>;
  }): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setPlaybackSpeed(options: { speed: number }): Promise<void>;
  seekTo(options: { position: number }): Promise<void>;
  getDuration(): Promise<{ duration: number }>;
  getCurrentPosition(): Promise<{ position: number }>;
  isPlaying(): Promise<{ playing: boolean }>;
}

const ExoPlayer = registerPlugin<ExoPlayerPlugin>('ExoPlayer');
export default ExoPlayer; 