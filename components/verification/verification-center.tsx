"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  FileSearch,
  Image as ImageIcon,
  Loader2,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { parseVerificationInput } from "@/lib/certificates/verification-input";

type ScannerStatus =
  | "idle"
  | "initializing"
  | "scanning"
  | "detected"
  | "invalid_qr"
  | "error";

export function VerificationCenter() {
  const router = useRouter();

  // Camera scanner state
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Image upload state
  const [imageDecoding, setImageDecoding] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual code input state
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Stop camera stream & controls safely
  const stopCameraResources = () => {
    try {
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop();
        scannerControlsRef.current = null;
      }
    } catch {
      // Ignore reader stop error
    }

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track stop error
          }
        });
        mediaStreamRef.current = null;
      }
    } catch {
      // Ignore stream stop error
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraResources();
    };
  }, []);

  const handleStartCamera = async () => {
    stopCameraResources();
    setScannerError(null);
    setScannerStatus("initializing");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setScannerStatus("error");
      setScannerError(
        "Camera scanning is unavailable in this browser. Use QR image upload or manual verification.",
      );
      return;
    }

    try {
      // Dynamically import @zxing/browser only when requested
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();

      // Request media stream with rear camera preference
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaError: unknown) {
        const errorName =
          mediaError instanceof Error ? mediaError.name : String(mediaError);
        if (
          errorName === "NotAllowedError" ||
          errorName === "PermissionDeniedError"
        ) {
          setScannerError(
            "Camera permission was denied. Allow camera access or upload a QR image instead.",
          );
        } else if (
          errorName === "NotFoundError" ||
          errorName === "DevicesNotFoundError"
        ) {
          setScannerError(
            "No camera was found on this device. Upload a QR image or enter the verification code.",
          );
        } else if (
          errorName === "NotReadableError" ||
          errorName === "TrackStartError"
        ) {
          setScannerError(
            "Camera could not be started. Close other camera apps and try again.",
          );
        } else {
          setScannerError(
            "Camera scanning is unavailable in this browser. Use QR image upload or manual verification.",
          );
        }
        setScannerStatus("error");
        return;
      }

      mediaStreamRef.current = stream;

      if (!videoRef.current) {
        stopCameraResources();
        setScannerStatus("error");
        setScannerError("Camera preview element was not ready. Please try again.");
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});

      setScannerStatus("scanning");

      const controls = await reader.decodeFromStream(
        stream,
        videoRef.current,
        (result, error) => {
          if (result) {
            const rawText = result.getText();
            const parsed = parseVerificationInput(rawText);

            if (parsed.valid) {
              stopCameraResources();
              setScannerStatus("detected");
              router.push(parsed.navigationPath);
            } else {
              stopCameraResources();
              setScannerStatus("invalid_qr");
              setScannerError(
                "This QR code is not a Barangay Bato certificate verification code.",
              );
            }
          }
          if (error && error.name !== "NotFoundException") {
            // Normal scan frame without QR; ignore
          }
        },
      );

      scannerControlsRef.current = controls;
    } catch {
      stopCameraResources();
      setScannerStatus("error");
      setScannerError(
        "Camera could not be started. Close other camera apps and try again.",
      );
    }
  };

  const handleStopCamera = () => {
    stopCameraResources();
    setScannerStatus("idle");
    setScannerError(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImageDecoding(true);
    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(file);
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();

      const result = await reader.decodeFromImageUrl(objectUrl);
      const rawText = result.getText();
      const parsed = parseVerificationInput(rawText);

      if (parsed.valid) {
        router.push(parsed.navigationPath);
      } else {
        setImageError(
          "This QR code is not a Barangay Bato certificate verification code.",
        );
      }
    } catch {
      setImageError(
        "No readable QR code found in the uploaded image. Please try another image.",
      );
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setImageDecoding(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const trimmed = manualInput.trim();
    if (!trimmed) {
      setManualError("Please enter a verification code or paste a verification link.");
      return;
    }

    setManualSubmitting(true);
    const parsed = parseVerificationInput(trimmed);

    if (parsed.valid) {
      router.push(parsed.navigationPath);
    } else {
      setManualSubmitting(false);
      setManualError(
        "Invalid verification input. Enter a code like BB-XXXXXXXX or paste a valid verification link.",
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Method 1: Camera Scanner */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Camera className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold">Scan QR Code</h2>
            <p className="text-sm text-base-content/70">
              Use your device camera to scan the printed certificate QR code
            </p>
          </div>
        </div>

        <div className="mt-5">
          {scannerStatus === "idle" ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-base-300 bg-base-200/50 p-8 text-center">
              <QrCode className="size-16 text-base-content/40" aria-hidden />
              <p className="mt-3 text-sm text-base-content/70">
                Camera access is requested only after you click Start Camera.
              </p>
              <button
                type="button"
                onClick={handleStartCamera}
                className="btn btn-primary mt-4 gap-2"
              >
                <Camera className="size-4" aria-hidden />
                Start Camera
              </button>
            </div>
          ) : null}

          {scannerStatus === "initializing" ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-base-300 bg-base-200/50 p-8 text-center">
              <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
              <p className="mt-3 font-medium text-base-content">
                Starting camera...
              </p>
            </div>
          ) : null}

          {scannerStatus === "scanning" ? (
            <div className="space-y-4">
              <div className="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-lg border-2 border-primary bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="size-full object-cover"
                />
                {/* Scan Area Overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="size-48 rounded-lg border-2 border-dashed border-primary/80 bg-primary/5" />
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <CameraOff className="size-4" aria-hidden />
                  Stop Camera
                </button>
              </div>
            </div>
          ) : null}

          {scannerStatus === "detected" ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-success/30 bg-success/10 p-6 text-center text-success">
              <CheckCircle2 className="size-10" aria-hidden />
              <p className="mt-2 font-bold">QR code detected</p>
              <p className="text-xs">Loading verification record...</p>
            </div>
          ) : null}

          {scannerStatus === "invalid_qr" || scannerStatus === "error" ? (
            <div className="space-y-4">
              <div className="alert alert-error">
                <ShieldAlert className="size-5 shrink-0" aria-hidden />
                <span className="text-sm">
                  {scannerError ??
                    "This QR code is not a Barangay Bato certificate verification code."}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="btn btn-primary btn-sm gap-2"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Scan Again
                </button>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Method 2: Fallback Image Upload */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <ImageIcon className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold">Upload QR Image</h2>
            <p className="text-sm text-base-content/70">
              Upload a screenshot or photo of the certificate QR code (decoded locally in your browser)
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-base-300 bg-base-200/40 p-6 text-center hover:bg-base-200">
            <Upload className="size-8 text-base-content/40" aria-hidden />
            <span className="mt-2 text-sm font-semibold">
              {imageDecoding ? "Decoding image..." : "Select QR Image File"}
            </span>
            <span className="text-xs text-base-content/60">
              Supports PNG, JPG, WEBP — decoded securely on your device
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={imageDecoding}
            />
          </label>

          {imageDecoding ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>Scanning image for QR code...</span>
            </div>
          ) : null}

          {imageError ? (
            <div className="alert alert-error mt-4">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              <span className="text-sm">{imageError}</span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Method 3: Manual Verification Code */}
      <section className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FileSearch className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold">Manual Verification Code or Link</h2>
            <p className="text-sm text-base-content/70">
              Enter the short code (e.g. BB-XXXXXXXX) or paste the verification link/token
            </p>
          </div>
        </div>

        <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. BB-A1B2C3D4 or /verify/..."
              className="input input-bordered flex-1 font-mono uppercase"
              disabled={manualSubmitting}
            />
            <button
              type="submit"
              disabled={manualSubmitting}
              className="btn btn-primary"
            >
              {manualSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Verify
            </button>
          </div>

          {manualError ? (
            <div className="alert alert-error">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              <span className="text-sm">{manualError}</span>
            </div>
          ) : null}
        </form>
      </section>

      {/* Privacy & Scope Disclaimer */}
      <div className="rounded-xl border border-base-300 bg-base-200/50 p-5 text-xs text-base-content/70 space-y-1">
        <p className="font-semibold text-base-content">Privacy and Verification Notice:</p>
        <p>
          • Camera frames and uploaded QR images are processed entirely on your device and are never uploaded or permanently stored.
        </p>
        <p>
          • Verification validates the certificate record and current status against the official Barangay Bato database.
        </p>
        <p>
          • Verification confirms that an authentic record exists in the system; it does not prove that a printed physical copy is the sole original.
        </p>
      </div>
    </div>
  );
}
