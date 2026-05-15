import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { X, Camera, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  label?: string;
}

export default function BarcodeScanner({ onScan, onClose, label }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    let stopped = false;

    async function startScan() {
      try {
        setScanning(true);
        setError(null);

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices.find((d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        )?.deviceId ?? devices[0]?.deviceId;

        if (!deviceId) {
          setError("No camera found");
          setScanning(false);
          return;
        }

        await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (stopped) return;
          if (result) {
            onScan(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Scan error:", err);
          }
        });
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : "Camera access denied");
          setScanning(false);
        }
      }
    }

    startScan();

    return () => {
      stopped = true;
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onScan]);

  return (
    <div className="flex flex-col gap-3">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video w-full max-w-sm mx-auto">
        <video
          ref={videoRef}
          className={cn("w-full h-full object-cover", !scanning && "opacity-30")}
          muted
          playsInline
        />
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/80 rounded w-48 h-28 relative">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70 animate-pulse" />
            </div>
          </div>
        )}
        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Camera className="w-8 h-8 opacity-50" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
            <CameraOff className="w-8 h-8 opacity-70" />
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onClose} className="gap-2 self-center">
        <X className="w-4 h-4" />
        Cancel
      </Button>
    </div>
  );
}
