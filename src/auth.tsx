import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { api, errorMessage, setFirebaseAuth } from "./lib/api";
import type { Config, Profile } from "./types";

interface AuthContextValue {
  identity: User | null;
  profile: Profile | null;
  config: Config | null;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  verify: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue>(null!);
let emulatorConnected = false;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    const auth = getAuth();
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    setProfile(await api<Profile>("/me"));
  }
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    api<Config>("/config")
      .then((value) => {
        if (!active) return;
        setConfig(value);
        if (!value.firebase) {
          setReady(true);
          return;
        }
        const app = getApps()[0] ?? initializeApp(value.firebase);
        const auth = getAuth(app);
        setFirebaseAuth(auth);
        if (
          value.emulator &&
          ["localhost", "127.0.0.1"].includes(location.hostname) &&
          !emulatorConnected
        ) {
          connectAuthEmulator(auth, value.emulator, { disableWarnings: true });
          emulatorConnected = true;
        }
        unsubscribe = onAuthStateChanged(auth, async (current) => {
          if (!active) return;
          setIdentity(current);
          setError("");
          if (!current) {
            setProfile(null);
            setReady(true);
            return;
          }
          try {
            const result = await api<Profile>("/me");
            if (active) setProfile(result);
          } catch (err) {
            if (active) setError(errorMessage(err));
          } finally {
            if (active) setReady(true);
          }
        });
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err));
          setReady(true);
        }
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        identity,
        profile,
        config,
        ready,
        error,
        refresh,
        logout: async () => {
          await signOut(getAuth());
        },
        verify: async () => {
          const current = getAuth().currentUser;
          if (current)
            await sendEmailVerification(current, {
              url: `${location.origin}/verify-email`,
            });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
