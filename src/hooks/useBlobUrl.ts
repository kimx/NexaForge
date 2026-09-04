import { useEffect, useState } from "react";
import { createObjectUrl, revokeObjectUrl } from "../utils/download";

export function useBlobUrl(blob: Blob | null | undefined): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!blob || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setUrl("");
      return;
    }

    const objectUrl = createObjectUrl(blob);
    setUrl(objectUrl);

    return () => {
      revokeObjectUrl(objectUrl);
    };
  }, [blob]);

  return url;
}
