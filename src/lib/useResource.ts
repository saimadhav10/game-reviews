import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";
export function useResource<T>(path: string | null, identity = "") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!path);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((x) => x + 1), []);
  useEffect(() => {
    let active = true;
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((err) => {
        if (active) {
          setData(null);
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, identity, revision]);
  return { data, loading, error, reload, setData };
}
