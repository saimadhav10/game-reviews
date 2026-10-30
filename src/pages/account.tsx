import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  verifyPasswordResetCode,
} from "firebase/auth";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  Link2,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Shield,
  Star,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  Alert,
  AuthGuard,
  Breadcrumbs,
  Button,
  EmptyState,
  ErrorState,
  GameImage,
  Loading,
  PageTitle,
  ReviewCard,
  SpoilerText,
  StatusBadge,
} from "../components";
import { api, errorMessage, json } from "../lib/api";
import { useResource } from "../lib/useResource";
import type { Comment, Game, OwnReview, Review } from "../types";

function authMessage(err: unknown) {
  const code = (err as { code?: string }).code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use":
      "An account already uses this email. Try signing in.",
    "auth/weak-password":
      "Choose a stronger password with at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/popup-closed-by-user":
      "The sign-in window was closed. Please try again.",
    "auth/popup-blocked":
      "Allow the sign-in popup in your browser, then try again.",
    "auth/too-many-requests":
      "Too many attempts. Please wait before trying again.",
    "auth/network-request-failed":
      "Check your internet connection and try again.",
    "auth/operation-not-allowed":
      "This sign-in method has not been enabled by the website administrator.",
    "auth/unauthorized-domain":
      "This website address needs to be authorized in Firebase Authentication.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code":
      "This link has already been used or is no longer valid.",
  };
  return code && messages[code] ? messages[code] : errorMessage(err);
}
function safeNext(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/";
}

export function AuthenticationPage({
  mode,
}: {
  mode: "sign-in" | "register" | "forgot";
}) {
  const { config, ready, identity, refresh } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const next = safeNext(params.get("next"));
  const register = mode === "register";
  const forgot = mode === "forgot";
  useEffect(() => {
    setError("");
    setSent(false);
  }, [mode]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (forgot) {
        await sendPasswordResetEmail(getAuth(), email, {
          url: `${location.origin}/sign-in`,
        });
        setSent(true);
        return;
      }
      if (register) {
        const result = await createUserWithEmailAndPassword(
          getAuth(),
          email,
          password,
        );
        await api("/me", json("PATCH", { display_name: name, anonymous }));
        let failed = false;
        try {
          await sendEmailVerification(result.user, {
            url: `${location.origin}/verify-email`,
          });
        } catch {
          failed = true;
        }
        await refresh();
        navigate(
          `/verify-email?next=${encodeURIComponent(next)}${failed ? "&resend=1" : ""}`,
        );
      } else {
        await signInWithEmailAndPassword(getAuth(), email, password);
        await refresh();
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(getAuth(), new GoogleAuthProvider());
      await refresh();
      navigate(next, { replace: true });
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;
  return (
    <div className="auth-layout">
      <aside className="auth-story panel yellow">
        <span className="eyebrow">WELCOME TO GAMEREVIEWS</span>
        <h1>
          GREAT GAMES.
          <br />
          STRONG OPINIONS.
          <br />
          <span className="inverted-text">YOUR PEOPLE.</span>
        </h1>
        <p>Every platform has a place. Every honest opinion adds something.</p>
        <div className="auth-benefits">
          <span>
            <Star size={20} />
            Rate games your way.
          </span>
          <span>
            <MessageSquare size={20} />
            Get into the conversation.
          </span>
          <span>
            <Shield size={20} />
            Keep your identity your own.
          </span>
        </div>
        <div className="auth-story-art" aria-hidden="true">
          <Gamepad2 size={115} strokeWidth={1} />
          <span>
            PLAY.
            <br />
            RATE.
            <br />
            REPEAT.
          </span>
        </div>
      </aside>
      <div className="auth-form-wrap panel">
        <span className="eyebrow">
          {forgot
            ? "LET’S GET YOU BACK IN"
            : register
              ? "JOIN THE CONVERSATION"
              : "GOOD TO HAVE YOU BACK"}
        </span>
        <h2>
          {forgot
            ? "FORGOT YOUR PASSWORD?"
            : register
              ? "CREATE YOUR ACCOUNT."
              : "SIGN IN."}
        </h2>
        <p className="muted">
          {forgot
            ? "We’ll send you a link to reset your password."
            : register
              ? "One account. Every game. Your honest take."
              : "Your next great conversation is waiting."}
        </p>
        {!config?.firebase ? (
          <Alert>
            Account services are not connected yet. You can still{" "}
            <Link to="/games">browse the game catalog</Link>.
          </Alert>
        ) : sent ? (
          <>
            <Alert type="success">
              If an account exists for this email, a password reset link is on
              its way. Check your inbox and spam folder.
            </Alert>
            <Button to="/sign-in">
              Back to sign in <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <>
            {identity && !forgot && (
              <Alert>
                You are already signed in. <Link to={next}>Continue →</Link>
              </Alert>
            )}
            {!forgot && (
              <>
                <Button
                  className="white google-button"
                  disabled={busy}
                  onClick={() => void google()}
                >
                  <span className="google-g">G</span> Continue with Google
                </Button>
                <div className="auth-divider">
                  <span>OR USE YOUR EMAIL</span>
                </div>
              </>
            )}
            <form onSubmit={(e) => void submit(e)}>
              {register && (
                <label>
                  Display name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="Your community name"
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                />
              </label>
              {!forgot && (
                <label>
                  Password
                  <div className="password-input">
                    <input
                      type={visible ? "text" : "password"}
                      minLength={register ? 8 : 1}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                      placeholder={
                        register
                          ? "At least 8 characters"
                          : "Enter your password"
                      }
                      required
                    />
                    <button
                      type="button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              {register && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  <span>Enable anonymous mode across my public profile.</span>
                </label>
              )}
              {!register && !forgot && (
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              )}
              {error && <Alert type="error">{error}</Alert>}
              <Button type="submit" className="full-width" disabled={busy}>
                {busy
                  ? "Please wait..."
                  : forgot
                    ? "Send reset link"
                    : register
                      ? "Create account"
                      : "Sign in"}{" "}
                <ArrowRight size={17} />
              </Button>
            </form>
            <p className="auth-switch">
              {forgot ? (
                <Link to="/sign-in">← Back to sign in</Link>
              ) : register ? (
                <>
                  Already part of the community?{" "}
                  <Link to={`/sign-in?next=${encodeURIComponent(next)}`}>
                    Sign in.
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link to={`/register?next=${encodeURIComponent(next)}`}>
                    Create an account.
                  </Link>
                </>
              )}
            </p>
            {register && (
              <p className="legal-note">
                Read our <Link to="/guidelines">community guidelines</Link>,{" "}
                <Link to="/privacy">privacy information</Link>, and{" "}
                <Link to="/terms">terms</Link> before joining.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const { identity, profile, verify, refresh } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function action(resend: boolean) {
    setBusy(true);
    setError("");
    try {
      if (resend) {
        await verify();
        setMessage("Verification email sent. Check your inbox.");
      } else {
        await refresh();
        if (!getAuth().currentUser?.emailVerified)
          setMessage(
            "Your email is not verified yet. Open the link in your inbox, then check again.",
          );
      }
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthGuard>
      <div className="narrow-page panel">
        <div className="form-body">
          <Mail size={42} />
          <h1>
            {profile?.verified ? "YOU’RE VERIFIED." : "CHECK YOUR INBOX."}
          </h1>
          <p>
            {profile?.verified
              ? "You’re ready to rate games, share reviews, and join the conversation."
              : `Verify ${identity?.email ?? "your email address"} before contributing. Open the verification link, then come back here.`}
          </p>
          {params.get("resend") && !profile?.verified && (
            <Alert>
              The first verification email could not be sent. Use “Resend email”
              to try again.
            </Alert>
          )}
          {message && <Alert>{message}</Alert>}
          {error && <Alert type="error">{error}</Alert>}
          {profile?.verified ? (
            <Button to={next}>
              Continue <ArrowRight size={17} />
            </Button>
          ) : (
            <div className="form-actions">
              <Button disabled={busy} onClick={() => void action(false)}>
                I’ve verified my email <Check size={16} />
              </Button>
              <Button
                disabled={busy}
                className="white"
                onClick={() => void action(true)}
              >
                Resend email
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

export function AuthActionPage() {
  const { ready, config, refresh, identity } = useAuth();
  const [params, setParams] = useSearchParams();
  const started = useRef(false);
  const mode = params.get("mode");
  const code = params.get("oobCode") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (!ready || !config?.firebase || started.current) return;
    started.current = true;
    if (!code || !["verifyEmail", "resetPassword"].includes(mode ?? "")) {
      setError("This account link is incomplete or unsupported.");
      return;
    }
    setBusy(true);
    const task =
      mode === "verifyEmail"
        ? applyActionCode(getAuth(), code).then(async () => {
            if (identity) await refresh();
            setDone(true);
            setParams({}, { replace: true });
          })
        : verifyPasswordResetCode(getAuth(), code).then(setEmail);
    void task
      .catch((err) => setError(authMessage(err)))
      .finally(() => setBusy(false));
  }, [ready, config]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(getAuth(), code, password);
      setDone(true);
      setParams({}, { replace: true });
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow-page panel">
      <div className="form-body">
        <Shield size={37} />
        <h1>
          {done
            ? "ALL SET."
            : mode === "resetPassword"
              ? "SET A NEW PASSWORD."
              : "VERIFYING YOUR EMAIL."}
        </h1>
        {done ? (
          <>
            <Alert type="success">
              Your account action completed successfully.
            </Alert>
            <Button to="/sign-in">
              Continue to sign in <ArrowRight size={16} />
            </Button>
          </>
        ) : error ? (
          <>
            <Alert type="error">{error}</Alert>
            <Button to="/forgot-password" className="white">
              Request a new password link
            </Button>
            <Link to="/verify-email" className="text-link">
              Resend email verification →
            </Link>
          </>
        ) : busy || !ready ? (
          <Loading />
        ) : mode === "resetPassword" && email ? (
          <form onSubmit={(e) => void submit(e)}>
            <p>Choose a new password for {email}.</p>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={busy}>
              Save new password <ArrowRight size={16} />
            </Button>
          </form>
        ) : !config?.firebase ? (
          <Alert>Account services are not configured yet.</Alert>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsForm />
    </AuthGuard>
  );
}
function SettingsForm() {
  const { profile, identity, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [anonymous, setAnonymous] = useState(!!profile?.anonymous);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setAnonymous(!!profile.anonymous);
    }
  }, [profile?.display_name, profile?.anonymous]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/me", json("PATCH", { display_name: name, anonymous }));
      await refresh();
      setMessage(
        "Your account settings have been saved. Public contributions now use this identity setting.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function steam(unlink = false) {
    setBusy(true);
    setError("");
    try {
      if (unlink) {
        await api("/integrations/steam", json("DELETE"));
        await refresh();
        setMessage("Steam account unlinked.");
      } else {
        const { url } = await api<{ url: string }>(
          "/integrations/steam/start",
          json("POST"),
        );
        window.location.assign(url);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(getAuth(), profile!.email, {
        url: `${location.origin}/sign-in`,
      });
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Breadcrumbs items={[{ label: "Account settings" }]} />
      <PageTitle eyebrow="YOUR ACCOUNT. YOUR RULES." title="ACCOUNT SETTINGS.">
        <p>Control your public identity and manage how you sign in.</p>
      </PageTitle>
      <div className="settings-grid">
        <form className="panel" onSubmit={(e) => void save(e)}>
          <div className="panel-bar">PUBLIC IDENTITY</div>
          <div className="form-body">
            <label>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={40}
                required
              />
            </label>
            <div className="anonymity-setting">
              <div>
                <Shield size={26} />
                <h3>ANONYMOUS MODE</h3>
                <p>
                  Hide your display name across your entire public profile,
                  ratings, reviews, replies, and highlights. You’ll appear as
                  “Anonymous Gamer.”
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  aria-label="Enable anonymous mode"
                />
                <span />
              </label>
            </div>
            <p className="field-help">
              Your contributions remain grouped on your public profile.
              Anonymity hides your public name; it does not hide your account
              from administrators.
            </p>
            <Button disabled={busy} type="submit">
              {busy ? "Saving..." : "Save settings"} <Save size={16} />
            </Button>
          </div>
        </form>
        <div className="settings-side">
          <div className="panel">
            <div className="panel-bar">SIGN-IN & SECURITY</div>
            <div className="form-body">
              <label>
                Email address
                <input value={profile?.email ?? ""} readOnly />
              </label>
              <span className="badge">
                {profile?.verified ? "EMAIL VERIFIED" : "EMAIL NOT VERIFIED"}
              </span>
              {!profile?.verified && (
                <Link className="text-link" to="/verify-email">
                  Verify your email →
                </Link>
              )}
              <p className="muted">
                Sign-in methods:{" "}
                {identity?.providerData
                  .map((p) =>
                    p.providerId === "password"
                      ? "Email/password"
                      : p.providerId === "google.com"
                        ? "Google"
                        : p.providerId,
                  )
                  .join(", ")}
              </p>
              {identity?.providerData.some(
                (p) => p.providerId === "password",
              ) && (
                <Button
                  className="white compact"
                  disabled={busy}
                  onClick={() => void reset()}
                >
                  Send password reset email <Mail size={15} />
                </Button>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-bar">
              <Link2 size={15} /> OPTIONAL STEAM CONNECTION
            </div>
            <div className="form-body">
              {params.has("steam") && (
                <Alert
                  type={params.get("steam") === "linked" ? "success" : "error"}
                >
                  {params.get("steam") === "linked"
                    ? "Your Steam account is linked."
                    : "Steam linking did not finish. Try connecting again."}
                  <button
                    className="text-button"
                    onClick={() => setParams({}, { replace: true })}
                  >
                    Dismiss
                  </button>
                </Alert>
              )}
              <p>
                Link your Steam account through Steam’s own sign-in page. No
                playtime proof is needed to rate or review.
              </p>
              {profile?.steam_id ? (
                <>
                  <span className="badge">STEAM CONNECTED</span>
                  <p className="field-help">
                    Your Steam ID is private and is not shown on your public
                    profile.
                  </p>
                  <Button
                    className="white compact"
                    disabled={busy}
                    onClick={() => void steam(true)}
                  >
                    Unlink Steam
                  </Button>
                </>
              ) : (
                <Button
                  className="white"
                  disabled={busy || !profile?.verified}
                  onClick={() => void steam()}
                >
                  Connect Steam <ArrowRight size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}
    </>
  );
}

interface Contributions {
  reviews: (OwnReview & { game_id: string; game_title: string })[];
  comments: {
    id: string;
    body: string;
    review_id: string;
    status: string;
    reason: string;
    game_title: string;
  }[];
  ratings: {
    game_id: string;
    title: string;
    score: number;
    cover_url: string;
  }[];
  suggestions: {
    id: string;
    title: string;
    status: string;
    reason: string;
    game_id: string | null;
  }[];
}
export function ContributionsPage() {
  const { identity } = useAuth();
  const [tab, setTab] = useState<keyof Contributions>("reviews");
  const { data, error, loading, reload } = useResource<Contributions>(
    identity ? "/me/contributions" : null,
    identity?.uid,
  );
  return (
    <AuthGuard>
      <Breadcrumbs items={[{ label: "My contributions" }]} />
      <PageTitle
        eyebrow="YOUR CORNER OF THE COMMUNITY"
        title="YOUR CONTRIBUTIONS."
      >
        <p>Every score, review, reply, and game suggestion—all in one place.</p>
      </PageTitle>
      <div
        className="tabs contribution-tabs"
        role="tablist"
        aria-label="Contribution type"
      >
        {(["reviews", "ratings", "comments", "suggestions"] as const).map(
          (key) => (
            <button
              role="tab"
              aria-selected={tab === key}
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {key === "suggestions" ? "Game suggestions" : key}
              <span>{data?.[key].length ?? 0}</span>
            </button>
          ),
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error} retry={reload} />
      ) : !data[tab].length ? (
        <div className="panel">
          <EmptyState
            title={`NO ${tab === "suggestions" ? "GAME SUGGESTIONS" : tab.toUpperCase()} YET.`}
            action={
              <Button to={tab === "suggestions" ? "/suggest-game" : "/games"}>
                {tab === "suggestions" ? "Suggest a game" : "Find your game"}{" "}
                <ArrowRight size={16} />
              </Button>
            }
          >
            <p>
              Your contributions will appear here, including submissions
              awaiting approval.
            </p>
          </EmptyState>
        </div>
      ) : (
        <div className="contribution-list">
          {tab === "reviews" &&
            data.reviews.map((review) => (
              <article key={review.id} className="panel contribution-card">
                <div>
                  <span className="eyebrow">{review.game_title}</span>
                  <h3>{review.pending_title ?? review.title}</h3>
                  <StatusBadge status={review.status} />
                  {review.published_at && review.status !== "approved" && (
                    <span className="badge">APPROVED VERSION STILL PUBLIC</span>
                  )}
                  <SpoilerText
                    text={review.pending_body ?? review.body ?? ""}
                    preview
                  />
                  {review.reason && (
                    <Alert type="error">Admin feedback: {review.reason}</Alert>
                  )}
                </div>
                <div className="contribution-actions">
                  <Button
                    className="compact white"
                    to={`/games/${review.game_id}/review`}
                  >
                    Edit submission
                  </Button>
                  {review.published_at && (
                    <Link className="text-link" to={`/reviews/${review.id}`}>
                      View public review →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          {tab === "ratings" &&
            data.ratings.map((rating) => (
              <Link
                className="panel rating-contribution"
                to={`/games/${rating.game_id}?rate=1`}
                key={rating.game_id}
              >
                <div>
                  <Star size={21} />
                  <h3>{rating.title}</h3>
                </div>
                <strong>
                  {rating.score.toFixed(1)}
                  <small>/10</small>
                </strong>
                <span className="text-link">Edit rating →</span>
              </Link>
            ))}
          {tab === "comments" &&
            data.comments.map((comment) => (
              <article className="panel contribution-card" key={comment.id}>
                <div>
                  <span className="eyebrow">{comment.game_title}</span>
                  <StatusBadge status={comment.status} />
                  <SpoilerText text={comment.body} />
                  {comment.reason && (
                    <Alert type="error">Admin feedback: {comment.reason}</Alert>
                  )}
                </div>
                <Link
                  className="text-link"
                  to={`/reviews/${comment.review_id}${comment.status === "approved" ? `#comment-${comment.id}` : ""}`}
                >
                  Open discussion →
                </Link>
              </article>
            ))}
          {tab === "suggestions" &&
            data.suggestions.map((suggestion) => (
              <article className="panel contribution-card" key={suggestion.id}>
                <div>
                  <h3>{suggestion.title}</h3>
                  <StatusBadge status={suggestion.status} />
                  {suggestion.reason && (
                    <Alert type="error">
                      Admin feedback: {suggestion.reason}
                    </Alert>
                  )}
                </div>
                {suggestion.game_id && (
                  <Button
                    className="white compact"
                    to={`/games/${suggestion.game_id}`}
                  >
                    View game <ArrowRight size={15} />
                  </Button>
                )}
                {suggestion.status === "rejected" && (
                  <Button className="white compact" to="/suggest-game">
                    Submit a revised suggestion
                  </Button>
                )}
              </article>
            ))}
        </div>
      )}
    </AuthGuard>
  );
}

export function PublicProfilePage() {
  const { id } = useParams();
  const [tab, setTab] = useState("reviews");
  const { data, error, loading, reload } = useResource<{
    profile: {
      public_id: string;
      display_name: string;
      anonymous: boolean;
      created_at: number;
    };
    reviews: Review[];
    ratings: { game_id: string; title: string; score: number }[];
    comments: Comment[];
  }>(`/profiles/${id}`);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={reload} />;
  return (
    <>
      <Breadcrumbs items={[{ label: "Community profile" }]} />
      <section className="panel public-profile-header">
        <div className="profile-avatar">
          {data.profile.anonymous ? (
            <Shield size={46} />
          ) : (
            data.profile.display_name.slice(0, 1)
          )}
        </div>
        <div>
          <span className="eyebrow">
            COMMUNITY MEMBER {data.profile.anonymous && " / ANONYMOUS MODE"}
          </span>
          <h1>{data.profile.display_name}</h1>
          <p>Here for the games. Staying for the conversation.</p>
        </div>
        <div className="profile-stats">
          <div>
            <strong>{data.reviews.length}</strong>
            <span>REVIEWS</span>
          </div>
          <div>
            <strong>{data.ratings.length}</strong>
            <span>RATINGS</span>
          </div>
          <div>
            <strong>{data.comments.length}</strong>
            <span>REPLIES</span>
          </div>
        </div>
      </section>
      <div className="tabs" role="tablist" aria-label="Public contributions">
        {["reviews", "ratings", "comments"].map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {key}
          </button>
        ))}
      </div>
      {tab === "reviews" ? (
        data.reviews.length ? (
          <div className="review-grid">
            {data.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="panel">
            <EmptyState title="NO PUBLIC REVIEWS YET." />
          </div>
        )
      ) : tab === "ratings" ? (
        data.ratings.length ? (
          <div className="contribution-list">
            {data.ratings.map((rating) => (
              <Link
                className="panel rating-contribution"
                to={`/games/${rating.game_id}`}
                key={rating.game_id}
              >
                <h3>{rating.title}</h3>
                <strong>
                  {rating.score.toFixed(1)}
                  <small>/10</small>
                </strong>
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel">
            <EmptyState title="NO RATINGS YET." />
          </div>
        )
      ) : data.comments.length ? (
        <div className="contribution-list">
          {data.comments.map((comment) => (
            <article className="panel contribution-card" key={comment.id}>
              <div>
                <span className="eyebrow">{comment.game_title}</span>
                <SpoilerText text={comment.body} />
              </div>
              <Link
                className="text-link"
                to={`/reviews/${comment.review_id}#comment-${comment.id}`}
              >
                Read discussion →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="NO PUBLIC REPLIES YET." />
        </div>
      )}
    </>
  );
}

export function SuggestGamePage() {
  return (
    <AuthGuard>
      <SuggestGameForm />
    </AuthGuard>
  );
}
function SuggestGameForm() {
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [release, setRelease] = useState("");
  const [genres, setGenres] = useState("");
  const [developer, setDeveloper] = useState("");
  const [publisher, setPublisher] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(title.trim()), 300);
    return () => clearTimeout(timer);
  }, [title]);
  const matches = useResource<{ games: Game[] }>(
    search.length >= 2 ? `/games?q=${encodeURIComponent(search)}` : null,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "/suggestions",
        json("POST", {
          title,
          description,
          platforms,
          release_date: release,
          genres: genres
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          developer,
          publisher,
          reference_url: reference,
        }),
      );
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Breadcrumbs items={[{ label: "Suggest a missing game" }]} />
      <PageTitle eyebrow="HELP THE INDEX GROW" title="MISSING YOUR GAME?">
        <p>
          Make room for your favorite. Suggest a game and an admin will check it
          before adding it to the catalog.
        </p>
      </PageTitle>
      {done ? (
        <div className="panel">
          <EmptyState
            title="YOUR SUGGESTION IS IN."
            icon={<Check size={40} />}
            action={
              <Button to="/contributions">
                Track your submission <ArrowRight size={16} />
              </Button>
            }
          >
            <p>The game will appear in the catalog after admin approval.</p>
          </EmptyState>
        </div>
      ) : (
        <div className="suggestion-layout">
          <form className="panel" onSubmit={(e) => void submit(e)}>
            <div className="panel-bar">NEW GAME SUGGESTION</div>
            <div className="form-body">
              <label>
                Game title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={2}
                  maxLength={140}
                  placeholder="The game’s full title"
                  required
                />
              </label>
              {matches.data?.games.length ? (
                <div className="possible-matches">
                  <strong>ALREADY HERE? CHECK THESE FIRST.</strong>
                  {matches.data.games.slice(0, 4).map((game) => (
                    <Link to={`/games/${game.id}`} key={game.id}>
                      {game.title} <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              ) : null}
              <fieldset>
                <legend>
                  Platforms <span className="muted">— choose at least one</span>
                </legend>
                <div className="platform-checkboxes">
                  {[
                    "PC",
                    "Mac",
                    "Linux",
                    "PS5",
                    "PS4",
                    "Xbox Series",
                    "Xbox One",
                    "Switch",
                    "Switch 2",
                    "Android",
                    "iOS",
                    "Other",
                  ].map((platform) => (
                    <label className="checkbox-label" key={platform}>
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform)}
                        onChange={(e) =>
                          setPlatforms((old) =>
                            e.target.checked
                              ? [...old, platform]
                              : old.filter((x) => x !== platform),
                          )
                        }
                      />
                      {platform}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minLength={20}
                  maxLength={3000}
                  rows={5}
                  placeholder="Tell us what the game is about. Save your review for its game page."
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Release date <span className="optional">optional</span>
                  <input
                    type="date"
                    value={release}
                    onChange={(e) => setRelease(e.target.value)}
                  />
                </label>
                <label>
                  Genres <span className="optional">optional</span>
                  <input
                    value={genres}
                    maxLength={200}
                    onChange={(e) => setGenres(e.target.value)}
                    placeholder="RPG, Adventure"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Developer <span className="optional">optional</span>
                  <input
                    value={developer}
                    maxLength={140}
                    onChange={(e) => setDeveloper(e.target.value)}
                  />
                </label>
                <label>
                  Publisher <span className="optional">optional</span>
                  <input
                    value={publisher}
                    maxLength={140}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Reference link <span className="optional">optional</span>
                <input
                  type="url"
                  value={reference}
                  maxLength={1000}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Official website or store page"
                />
              </label>
              {error && <Alert type="error">{error}</Alert>}
              <div className="form-actions">
                <Button className="white" to="/games">
                  Cancel
                </Button>
                <Button disabled={busy || !platforms.length} type="submit">
                  {busy ? "Submitting..." : "Submit for approval"}{" "}
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </form>
          <aside className="panel yellow suggestion-tips">
            <Gamepad2 size={38} />
            <h2>
              BIG RELEASE.
              <br />
              TINY INDIE.
              <br />
              MOBILE FAVORITE.
            </h2>
            <p>
              They all belong here. Check the catalog before submitting, and
              include a reference link if you can.
            </p>
            <p>
              No review scores are imported with a game. Its GameReviews rating
              starts with our community.
            </p>
          </aside>
        </div>
      )}
    </>
  );
}
