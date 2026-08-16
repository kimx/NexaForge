import { useEffect, useState } from "react";

export function useBlobUrl(blob: Blob | null | undefined): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
