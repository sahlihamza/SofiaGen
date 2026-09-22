import { useCallback, useEffect, useRef, useState } from "react";
import { getMyContext } from "@/services/api/meAPI";
import { useStoreContext } from "@/context/StoreContext";

let contextCache = null;
let contextPromise = null;
let generation = 0;

export function invalidateAuthorizationContext() {
  contextCache = null;
  contextPromise = null;
}

export function useAuthorizationContext() {
  const [context, setContext] = useState(contextCache);
  const [isLoading, setIsLoading] = useState(!contextCache);
  const [error, setError] = useState(null);
  const { storeVersion } = useStoreContext() || {};
  const didMount = useRef(false);

  const refresh = useCallback(() => {
    const gen = ++generation;
    invalidateAuthorizationContext();
    setIsLoading(true);
    setError(null);
    contextPromise = getMyContext()
      .then((data) => {
        if (gen !== generation) return null;
        contextCache = data;
        setContext(data);
        setIsLoading(false);
        return data;
      })
      .catch((error) => {
        if (gen !== generation) return null;
        console.error("Failed to load authorization context:", error);
        setContext(null);
        setError(error);
        setIsLoading(false);
        return null;
      });
    return contextPromise;
  }, []);

  // Chargement initial  une seule fois au montage.
  useEffect(() => {
    if (contextCache) {
      setContext(contextCache);
      setIsLoading(false);
      return;
    }
    if (contextPromise) {
      contextPromise.then((data) => {
        setContext(data);
        setIsLoading(false);
      });
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rafraéchissement sur changement RéEL de store  ignore le premier passage,
  // déjà couvert par l'effet de montage ci-dessus.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeVersion]);

  const can = (permissionCode) => {
    if (!context?.permissions) return false;
    return context.permissions.includes(permissionCode);
  };

  const canModule = (moduleKey) => {
    if (!context?.accessibleModules) return false;
    return context.accessibleModules.includes(moduleKey);
  };

  return { ...context, can, canModule, refresh, isLoading, error };
}
