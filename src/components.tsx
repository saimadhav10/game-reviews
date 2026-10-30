import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Gamepad2,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Shield,
  ShieldCheck,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "./auth";
import { api, errorMessage, json } from "./lib/api";
import type { Game, Review } from "./types";

export function Button({
  children,
  to,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  to?: string;
}) {
  return to ? (
    <Link className={`button ${className}`} to={to}>
      {children}
    </Link>
  ) : (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="GameReviews home">
      <span className="brand-mark">
        <Trophy size={23} strokeWidth={2.5} />
      </span>
      <span>
        GAME<span>REVIEWS</span>
      </span>
    </Link>
  );
}
export function Header() {
  const { profile, identity, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenu(false);
    setAccount(false);
  }, [location.pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node))
        setAccount(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(false);
        setAccount(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <Search size={17} />
          <input
            aria-label="Search games"
            placeholder="Find your next obsession..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>↵</kbd>
        </form>
        <nav
          className={`main-nav ${menu ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/games">
            Browse
            <br className="desktop-break" /> games
          </NavLink>
          <NavLink to="/top-50">
            Top
            <br className="desktop-break" /> 50
          </NavLink>
          <NavLink to="/highlights">
            Daily
            <br className="desktop-break" /> highlights
          </NavLink>
          {profile?.admin && (
            <NavLink to="/admin">
              Admin
              <br className="desktop-break" /> queue
            </NavLink>
          )}
        </nav>
        {identity ? (
          <div className="account-wrap" ref={accountRef}>
            <button
              className="account-button"
              onClick={() => setAccount(!account)}
              aria-expanded={account}
              aria-label="Account menu"
            >
              {profile?.anonymous ? (
                <Shield size={19} />
              ) : (
                <UserRound size={19} />
              )}
              <span>{profile?.anonymous ? "ANON MODE" : "MY ACCOUNT"}</span>
              <ChevronDown size={14} />
            </button>
            {account && (
              <div className="account-menu">
                <span className="account-name">
                  {profile?.anonymous
                    ? "Anonymous Gamer"
                    : (profile?.display_name ?? "Your account")}
                </span>
                {profile && (
                  <Link to={`/profiles/${profile.public_id}`}>
                    Public profile
                  </Link>
                )}
                <Link to="/contributions">My contributions</Link>
                <Link to="/settings">Account settings</Link>
                {profile?.admin && (
                  <Link to="/admin">Moderation dashboard</Link>
                )}
                <button
                  onClick={() =>
                    void logout()
                      .then(() => navigate("/"))
                      .catch(() => setAccount(false))
                  }
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button
            to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
            className="header-signin"
          >
            Join / Sign in <ArrowRight size={15} />
          </Button>
        )}
        <button
          className="menu-toggle icon-button"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p>Every platform. Every player. Every opinion.</p>
          <small>© {new Date().getFullYear()} GameReviews</small>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/suggest-game">Suggest a game</Link>
          <Link to="/guidelines">Community guidelines</Link>
          <Link to="/help">Help center</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>YOUR GAMES. YOUR VERDICT.</span>
        <span>
          Game catalog imports powered by{" "}
          <a href="https://www.igdb.com" target="_blank" rel="noreferrer">
            IGDB
          </a>
          . Starter metadata: Steam.
        </span>
      </div>
    </footer>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <div className="page-description">{children}</div>}
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>
        {icon && <span className="section-icon">{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="loading-blocks">
        <i />
        <i />
        <i />
      </div>
      <p>LOADING THE GOOD STUFF...</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state error-state" role="alert">
      <Shield size={30} />
      <h2>Something needs a retry.</h2>
      <p>{message}</p>
      {retry && (
        <Button onClick={retry}>
          Try again <ArrowRight size={16} />
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ?? <Gamepad2 size={32} />}
      <h3>{title}</h3>
      {children && <div className="empty-description">{children}</div>}
      {action}
    </div>
  );
}
export function Alert({
  children,
  type = "info",
}: {
  children: ReactNode;
  type?: "info" | "success" | "error";
}) {
  return (
    <div
      className={`alert ${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {type === "success" ? <Check size={18} /> : <Shield size={18} />}
      <div>{children}</div>
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status}`}>
      {status === "pending" ? "Awaiting approval" : status}
    </span>
  );
}
export function Score({
  score,
  small = false,
}: {
  score: number | null | undefined;
  small?: boolean;
}) {
  return (
    <div
      className={`score ${small ? "small" : ""}`}
      aria-label={
        score == null ? "Not yet rated" : `${score.toFixed(1)} out of 10`
      }
    >
      {score == null ? (
        <>
          <strong>—</strong>
          <span>NOT RATED</span>
        </>
      ) : (
        <>
          <strong>{score.toFixed(1)}</strong>
          <span>/ 10</span>
        </>
      )}
    </div>
  );
}
export function GameImage({
  game,
  hero = false,
}: {
  game: Pick<Game, "cover_url" | "hero_url" | "title">;
  hero?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = hero ? game.hero_url || game.cover_url : game.cover_url;
  return url && !failed ? (
    <img
      src={url}
      alt={`${game.title} artwork`}
      loading={hero ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="image-fallback">
      <Gamepad2 size={40} />
      <span>{game.title}</span>
    </div>
  );
}
export function GameCard({ game, rank }: { game: Game; rank?: number }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className={`game-card ${rank === 1 ? "first-rank" : ""}`}
    >
      {rank && (
        <div className="rank-ribbon">
          <strong>#{rank.toString().padStart(2, "0")}</strong>
          <span>{rank === 1 ? "COMMUNITY #1" : "PLAYER RANKED"}</span>
        </div>
      )}
      <div className="game-card-image">
        <GameImage game={game} />
        <div className="platform-sticker">
          {game.platforms.slice(0, 3).join(" / ")}
          {game.platforms.length > 3 ? " +" : ""}
        </div>
      </div>
      <div className="game-card-body">
        <div className="game-card-genres">
          {game.genres.slice(0, 2).join(" · ")}
        </div>
        <h3>{game.title}</h3>
        <div className="game-card-meta">
          {game.developer || "Independent game"}
          {game.release_date && ` · ${game.release_date.slice(0, 4)}`}
        </div>
        <div className="game-card-rating">
          <div>
            <small>COMMUNITY SCORE</small>
            <strong>
              {game.rating == null ? "BE THE FIRST" : game.rating.toFixed(1)}
              {game.rating != null && <span>/10</span>}
            </strong>
          </div>
          <span>
            {game.rating_count.toLocaleString()}
            <small>RATINGS</small>
          </span>
        </div>
      </div>
    </Link>
  );
}
export function SpoilerText({
  text,
  preview = false,
}: {
  text: string;
  preview?: boolean;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const parts = text.split(/(>![\s\S]*?!<|\|\|[\s\S]*?\|\|)/g);
  return (
    <div className={`review-copy ${preview ? "preview" : ""}`}>
      {parts.map((part, i) => {
        const spoiler =
          (part.startsWith(">!") && part.endsWith("!<")) ||
          (part.startsWith("||") && part.endsWith("||"));
        if (!spoiler) return <span key={i}>{part}</span>;
        return (
          <button
            key={i}
            className={`spoiler ${revealed.has(i) ? "revealed" : ""}`}
            aria-expanded={revealed.has(i)}
            onClick={() =>
              setRevealed((old) => {
                const next = new Set(old);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
          >
            {revealed.has(i)
              ? part.slice(2, -2)
              : "⚠ SPOILER — CLICK TO REVEAL"}
          </button>
        );
      })}
    </div>
  );
}
export function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function Author({
  id,
  name,
  anonymous,
}: {
  id: string;
  name: string;
  anonymous: number | boolean;
}) {
  return (
    <Link className="author" to={`/profiles/${id}`}>
      <span className={`avatar ${anonymous ? "is-anonymous" : ""}`}>
        {anonymous ? <Shield size={15} /> : name.slice(0, 1).toUpperCase()}
      </span>
      <span>{name}</span>
    </Link>
  );
}
export function VoteControls({
  id,
  type,
  votes: initialVotes,
  myVote = 0,
}: {
  id: string;
  type: "review" | "comment";
  votes: number;
  myVote?: number;
}) {
  const { identity } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [votes, setVotes] = useState(initialVotes);
  const [selected, setSelected] = useState(myVote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setVotes(initialVotes);
    setSelected(myVote);
  }, [initialVotes, myVote]);
  async function vote(value: number) {
    if (!identity) {
      navigate(
        `/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ votes: number; my_vote: number }>(
        "/votes",
        json("PUT", { id, type, value: selected === value ? 0 : value }),
      );
      setVotes(result.votes);
      setSelected(result.my_vote);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="voting-wrap">
      <div className="vote-controls">
        <button
          disabled={busy}
          aria-label="Upvote"
          aria-pressed={selected === 1}
          className={selected === 1 ? "selected" : ""}
          onClick={() => void vote(1)}
        >
          <ArrowUp size={16} />
        </button>
        <span aria-live="polite">{votes}</span>
        <button
          disabled={busy}
          aria-label="Downvote"
          aria-pressed={selected === -1}
          className={selected === -1 ? "selected" : ""}
          onClick={() => void vote(-1)}
        >
          <ArrowDown size={16} />
        </button>
      </div>
      {error && (
        <span className="vote-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export function ReviewCard({
  review,
  featured = false,
  showGame = true,
}: {
  review: Review;
  featured?: boolean;
  showGame?: boolean;
}) {
  return (
    <article className={`review-card ${featured ? "featured-review" : ""}`}>
      {featured && (
        <div className="panel-bar">
          <span>COMMUNITY REVIEW OF THE DAY</span>
          <span>{review.daily_votes} NET VOTES / 24H</span>
        </div>
      )}
      <div className="review-card-inner">
        <div className="review-heading">
          <div>
            {showGame && (
              <Link className="eyebrow" to={`/games/${review.game_id}`}>
                {review.game_title}
              </Link>
            )}
            <h3>
              <Link to={`/reviews/${review.id}`}>{review.title}</Link>
            </h3>
          </div>
          {review.score != null && (
            <Score score={review.score} small={!featured} />
          )}
        </div>
        <div className="review-author-row">
          <Author
            id={review.author_id}
            name={review.author_name}
            anonymous={review.author_anonymous}
          />
          <span className="muted">
            {relativeTime(review.published_at)}
            {review.edited_at && " · edited"}
          </span>
        </div>
        {review.platform && (
          <span className="badge platform-badge">{review.platform}</span>
        )}
        <SpoilerText text={review.body} preview={!featured} />
        <div className="review-actions">
          <VoteControls
            id={review.id}
            type="review"
            votes={review.votes}
            myVote={review.my_vote}
          />
          <Link to={`/reviews/${review.id}`} className="discussion-link">
            <MessageSquare size={15} />
            {review.reply_count} replies <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; to?: string }[];
}) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span aria-hidden="true">/</span>
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function AuthGuard({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { ready, identity, profile, error } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={error}
        retry={() => location && window.location.reload()}
      />
    );
  if (!identity)
    return (
      <EmptyState
        title="Your next contribution starts here."
        icon={<UserRound size={36} />}
        action={
          <Button
            to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
          >
            Sign in to continue <ArrowRight size={16} />
          </Button>
        }
      >
        <p>Sign in to manage your account and join the community.</p>
      </EmptyState>
    );
  if (admin && !profile?.admin)
    return (
      <EmptyState
        title="Admin access required."
        icon={<ShieldCheck size={36} />}
        action={<Button to="/">Back to home</Button>}
      >
        <p>This area is reserved for GameReviews administrators.</p>
      </EmptyState>
    );
  return children;
}
