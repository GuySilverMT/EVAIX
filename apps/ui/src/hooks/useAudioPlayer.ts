
import { Howl } from 'howler';
import { useState, useEffect, useRef } from 'react';

interface UseAudioPlayer {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isLoaded: boolean;
}

export const useAudioPlayer = (src: string): UseAudioPlayer => {
  const [sound, setSound] = useState<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const newSound: Howl = new Howl({
      src: [src],
      format: ['wav'], // Assuming coqui-tts output is wav, adjust if needed
      onload: () => {
        setDuration(newSound.duration());
        setIsLoaded(true);
      },
      onplay: () => {
        setIsPlaying(true);
        const step = () => {
          setCurrentTime(newSound.seek());
          if (newSound.playing()) {
            animationFrameId.current = requestAnimationFrame(step);
          }
        };
        animationFrameId.current = requestAnimationFrame(step);
      },
      onpause: () => {
        setIsPlaying(false);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      },
      onstop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      },
      onend: () => {
        setIsPlaying(false);
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
      },
    });

    setSound(newSound);

    return () => {
      newSound.unload();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [src]);

  const play = () => {
    if (sound && !isPlaying) {
      sound.play();
    }
  };

  const pause = () => {
    if (sound && isPlaying) {
      sound.pause();
    }
  };

  const stop = () => {
    if (sound) {
      sound.stop();
    }
  };

  const seek = (time: number) => {
    if (sound) {
      sound.seek(time);
      setCurrentTime(time);
    }
  };

  return { play, pause, stop, seek, isPlaying, duration, currentTime, isLoaded };
};
