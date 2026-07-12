"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ScanLine } from "lucide-react";

const TAG_PATTERN = /AF-\d{3,}/i;

// Audit-specific variant of the asset-directory scanner (src/components/
// assets/qr-scanner-dialog.tsx): same camera/jsQR mechanics, but on a
// successful decode it hands the tag back via onScan instead of navigating
// away — scanning during a walkthrough should open that item's check dialog
// right here on the cycle page, not leave it.
export function AuditQrScanner({ onScan }: { onScan: (tag: string) => void }) {
  const [open, setOpen] = useState(false);
  const [manualTag, setManualTag] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        if (!cancelled) setCameraError("Camera unavailable — enter the asset tag below instead.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code?.data) {
            const match = code.data.match(TAG_PATTERN);
            if (match) {
              handleTag(match[0].toUpperCase());
              return;
            }
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopCamera() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function handleTag(tag: string) {
    stopCamera();
    setOpen(false);
    onScan(tag);
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tag = manualTag.trim().toUpperCase();
    if (tag) handleTag(tag);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanLine className="size-3.5" />
        Scan Asset
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) stopCamera();
          setOpen(o);
          setCameraError(null);
          setManualTag("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan asset QR code</DialogTitle>
            <DialogDescription>Point the camera at the asset&apos;s QR label to check it in this cycle</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!cameraError ? (
              <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{cameraError}</p>
            )}

            <form onSubmit={onManualSubmit} className="space-y-2">
              <Label htmlFor="manual-audit-tag">Or enter the asset tag</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-audit-tag"
                  placeholder="AF-0001"
                  value={manualTag}
                  onChange={(e) => setManualTag(e.target.value)}
                  autoFocus={!!cameraError}
                />
                <Button type="submit" variant="outline">Go</Button>
              </div>
            </form>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
