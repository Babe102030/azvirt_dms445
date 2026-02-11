import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Type definitions for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
}

// Augment window interface
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface VoiceActivationButtonProps {
  onCommand: (text: string) => void;
  isProcessing?: boolean;
}

export function VoiceActivationButton({ onCommand, isProcessing = false }: VoiceActivationButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false; // Stop after one command
      recognition.lang = 'bs-BA'; // Bosnian
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening...", { duration: 2000 });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          console.log("Voice command received:", transcript);
          onCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);

        if (event.error === 'not-allowed') {
           toast.error("Microphone access denied");
        } else if (event.error === 'no-speech') {
           // excessive alerting for no speech is annoying
        } else if (event.error !== 'aborted') {
           toast.error(`Voice Error: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech recognition not supported in this browser");
    }

    return () => {
      if (recognitionRef.current) {
        // We can't easily check state, but abort is safe to call
        try {
            recognitionRef.current.abort();
        } catch (e) {
            // ignore
        }
      }
    };
  }, [onCommand]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast.error("Failed to start voice recognition");
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={isListening ? "destructive" : "secondary"}
      size="icon"
      className={`rounded-full w-12 h-12 shadow-lg transition-all duration-300 ${
        isListening ? "animate-pulse ring-4 ring-red-200 ring-opacity-50" : ""
      }`}
      onClick={toggleListening}
      disabled={isProcessing}
      aria-label={isListening ? "Stop listening" : "Activate Voice Assistant"}
      title={isListening ? "Stop listening" : "Activate Voice Assistant"}
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </Button>
  );
}
