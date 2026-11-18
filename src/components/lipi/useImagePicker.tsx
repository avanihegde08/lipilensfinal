import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

import { capture } from "@/lib/lipi/capture";
import { fileToDataUrl } from "@/lib/lipi/image";

/** Hidden gallery file input that hands the chosen photo to the crop screen. */
export function useImagePicker(onPicked?: (dataUrl: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        capture.setSource(dataUrl);
        if (onPicked) onPicked(dataUrl);
        else void navigate({ to: "/scan/crop" });
      } catch (error) {
        toast.error((error as Error).message || "This image could not be opened.");
      }
    },
    [navigate, onPicked],
  );

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      className="hidden"
      onChange={onChange}
      aria-hidden
      tabIndex={-1}
    />
  );

  return { open: () => inputRef.current?.click(), input };
}
