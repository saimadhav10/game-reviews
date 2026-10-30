import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  Download,
  Gamepad2,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PencilLine,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  Alert,
  AuthGuard,
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageTitle,
  SpoilerText,
  StatusBadge,
  relativeTime,
} from "../components";
import { api, errorMessage, json } from "../lib/api";
import { useResource } from "../lib/useResource";
import type { Catalog, Game, GameDetail } from "../types";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard admin>
      <div className="admin-flag">
        <ShieldCheck size={16} /> ADMIN WORKSPACE{" "}
        <span>Public anonymity remains in effect outside this area.</span>
      </div>
      <nav className="admin-nav" aria-label="Admin navigation">
        <NavLink to="/admin" end>
          <LayoutDashboard size={17} />
          Overview
        </NavLink>
        <NavLink to="/admin/moderation">
          <ListChecks size={17} />
          Moderation queue
        </NavLink>
        <NavLink to="/admin/catalog">
          <Gamepad2 size={17} />
          Game catalog
        </NavLink>
        <NavLink to="/admin/settings">
          <Settings2 size={17} />
          Ranking settings
        </NavLink>
      </nav>
      {children}
    </AuthGuard>
  );
}
interface Overview {
  stats: {
    reviews: number;
    comments: number;
    suggestions: number;
    users: number;
    games: number;
  };
  log: {
    id: string;
    target_type: string;
    decision: string;
    reason: string;
    created_at: number;
    admin_name: string;
  }[];
  minimum_ratings: number;
}
export function AdminOverviewPage() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useResource<Overview>(
    profile?.admin ? "/admin/overview" : null,
  );
  return (
    <AdminShell>
      <PageTitle
        eyebrow="KEEP THE CONVERSATION WORTH HAVING"
        title="MODERATION CONTROL."
      >
        <p>
          Review new contributions, maintain the game catalog, and keep the
          community moving.
        </p>
      </PageTitle>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <>
          <div className="admin-stat-grid">
            {[
              ["reviews", "REVIEWS", PencilLine],
              ["comments", "REPLIES", MessageSquare],
              ["suggestions", "GAME SUGGESTIONS", Gamepad2],
            ].map(([key, label, Icon]) => {
              const Symbol = Icon as typeof PencilLine;
              return (
                <Link
                  className="panel admin-stat"
                  key={String(key)}
                  to={`/admin/moderation?type=${key}`}
                >
                  <Symbol size={24} />
                  <strong>
                    {data.stats[key as "reviews" | "comments" | "suggestions"]}
                  </strong>
                  <span>PENDING {String(label)}</span>
                  <ArrowRight size={20} />
                </Link>
              );
            })}
          </div>
          <div className="admin-overview-grid">
            <div className="panel">
              <div className="panel-bar">RECENT MODERATION ACTIVITY</div>
              {data.log.length ? (
                <div className="moderation-log">
                  {data.log.map((entry) => (
                    <div key={entry.id}>
                      <span className="log-icon">
                        {entry.decision === "approved" ? (
                          <Check size={17} />
                        ) : (
                          <X size={17} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {entry.target_type} {entry.decision}
                        </strong>
                        <p>
                          {entry.admin_name} · {relativeTime(entry.created_at)}
                        </p>
                        {entry.reason && <small>{entry.reason}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="THE QUEUE IS READY FOR YOUR FIRST DECISION.">
                  <p>Approvals and rejections will appear here.</p>
                </EmptyState>
              )}
            </div>
            <aside className="panel yellow admin-summary">
              <ShieldCheck size={34} />
              <h2>
                A LITTLE CARE.
                <br />A BETTER COMMUNITY.
              </h2>
              <p>
                Approve thoughtful reviews and replies. Reject abuse, spam, and
                exposed spoilers with clear feedback.
              </p>
              <dl>
                <div>
                  <dt>Community accounts</dt>
                  <dd>{data.stats.users}</dd>
                </div>
                <div>
                  <dt>Games in catalog</dt>
                  <dd>{data.stats.games}</dd>
                </div>
                <div>
                  <dt>Ranking threshold</dt>
                  <dd>{data.minimum_ratings}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      )}
    </AdminShell>
  );
}
interface QueueItem {
  id: string;
  user_id: string;
  display_name: string;
  anonymous: number;
  status: string;
  game_title?: string;
  title?: string;
  body?: string;
  platform?: string;
  pending_title?: string | null;
  pending_body?: string | null;
  pending_platform?: string | null;
  submitted_at?: number;
  created_at: number;
  published_at?: number | null;
  reason: string;
  review_title?: string;
  review_body?: string;
  parent_body?: string | null;
  platforms?: string;
  description?: string;
  reference_url?: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
}
type Queue = Record<"reviews" | "comments" | "suggestions", QueueItem[]>;
export function AdminModerationPage() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const type = ["reviews", "comments", "suggestions"].includes(
    params.get("type") ?? "",
  )
    ? (params.get("type")! as keyof Queue)
    : "reviews";
  const status = params.get("status") ?? "pending";
  const { data, error, loading, reload } = useResource<Queue>(
    profile?.admin ? `/admin/queue?status=${status}` : null,
  );
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  }
  return (
    <AdminShell>
      <PageTitle
        eyebrow="REVIEW BEFORE IT GOES LIVE"
        title="THE APPROVAL QUEUE."
        action={
          <label className="sort-label">
            STATUS
            <select
              aria-label="Submission status"
              value={status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        }
      >
        <p>
          Check the contribution, understand the context, then make the call.
        </p>
      </PageTitle>
      <div className="tabs" role="tablist" aria-label="Moderation type">
        {(["reviews", "comments", "suggestions"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={type === key}
            className={type === key ? "active" : ""}
            onClick={() => update("type", key)}
          >
            {key === "suggestions" ? "Game suggestions" : key}
            <span>{data?.[key].length ?? 0}</span>
          </button>
        ))}
      </div>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error} retry={reload} />
      ) : data[type].length ? (
        <div className="moderation-queue">
          {data[type].map((item) => (
            <ModerationCard
              key={`${type}-${item.id}`}
              item={item}
              type={
                type === "reviews"
                  ? "review"
                  : type === "comments"
                    ? "comment"
                    : "suggestion"
              }
              onDone={reload}
            />
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title={
              status === "pending"
                ? "ALL CLEAR. NOTHING WAITING HERE."
                : `NO ${status.toUpperCase()} SUBMISSIONS.`
            }
            icon={<CheckCheck size={40} />}
          >
            <p>
              {status === "pending"
                ? "New submissions will appear in this queue."
                : "Choose another status to review the queue."}
            </p>
          </EmptyState>
        </div>
      )}
    </AdminShell>
  );
}
function ModerationCard({
  item,
  type,
  onDone,
}: {
  item: QueueItem;
  type: "review" | "comment" | "suggestion";
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  async function decide(decision: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        "/admin/moderate",
        json("POST", {
          id: item.id,
          type,
          decision,
          reason,
          version: item.submitted_at,
          ...(type === "suggestion" ? { title, description } : {}),
        }),
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel moderation-card">
      <div className="panel-bar">
        <span>
          {type === "suggestion" ? "MISSING GAME REQUEST" : item.game_title}
          {type === "review" && item.published_at ? " / REVISION" : ""}
        </span>
        <StatusBadge status={item.status} />
      </div>
      <div className="moderation-card-body">
        <div className="moderation-author">
          <span className="avatar">{item.display_name.slice(0, 1)}</span>
          <div>
            <strong>{item.display_name}</strong>
            <span>
              {item.anonymous
                ? "PUBLIC IDENTITY: ANONYMOUS"
                : "PUBLIC DISPLAY NAME ENABLED"}
            </span>
          </div>
          <time>{relativeTime(item.submitted_at ?? item.created_at)}</time>
        </div>
        {type === "review" ? (
          <>
            <h2>{item.pending_title ?? item.title}</h2>
            <span className="badge">
              {item.pending_platform ?? item.platform}
            </span>
            <SpoilerText text={item.pending_body ?? item.body ?? ""} />
            {item.published_at && item.pending_body && (
              <details className="moderation-context">
                <summary>Compare with the currently published review</summary>
                <h3>{item.title}</h3>
                <SpoilerText text={item.body ?? ""} />
              </details>
            )}
          </>
        ) : type === "comment" ? (
          <>
            <div className="moderation-context">
              <strong>REPLYING UNDER: {item.review_title}</strong>
              {item.parent_body ? (
                <SpoilerText text={item.parent_body} preview />
              ) : (
                <SpoilerText text={item.review_body ?? ""} preview />
              )}
            </div>
            <SpoilerText text={item.body ?? ""} />
          </>
        ) : (
          <div className="suggestion-metadata">
            <label>
              Game title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                readOnly={item.status !== "pending"}
                minLength={2}
                maxLength={140}
              />
            </label>
            <div className="game-platforms">
              {JSON.parse(item.platforms ?? "[]").map((p: string) => (
                <span className="badge" key={p}>
                  {p}
                </span>
              ))}
            </div>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                minLength={20}
                maxLength={3000}
                readOnly={item.status !== "pending"}
              />
            </label>
            <dl className="game-facts">
              {[
                ["Developer", item.developer],
                ["Publisher", item.publisher],
                ["Released", item.release_date],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            {item.reference_url && (
              <a
                className="text-link"
                href={item.reference_url}
                target="_blank"
                rel="noreferrer"
              >
                Open verification reference ↗
              </a>
            )}
            <p className="field-help">
              Check for an existing catalog entry before approval. Approved game
              metadata can be edited in the catalog manager.
            </p>
          </div>
        )}
        {item.reason && <Alert>Previous feedback: {item.reason}</Alert>}
        {error && <Alert type="error">{error}</Alert>}
        {item.status === "pending" && (
          <div className="moderation-actions">
            {rejecting && (
              <label className="rejection-reason">
                Feedback for the author
                <textarea
                  aria-label="Rejection feedback"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  placeholder="Explain what needs changing before this can be accepted."
                  required
                />
              </label>
            )}
            <div className="form-actions">
              <Button
                className="white"
                disabled={busy}
                onClick={() =>
                  rejecting ? setRejecting(false) : setRejecting(true)
                }
              >
                {rejecting ? "Cancel rejection" : "Reject"} <X size={15} />
              </Button>
              {rejecting ? (
                <Button
                  className="danger"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() => void decide("rejected")}
                >
                  {busy ? "Saving..." : "Confirm rejection"}
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => void decide("approved")}>
                  {busy
                    ? "Approving..."
                    : type === "suggestion"
                      ? "Approve & add game"
                      : "Approve & publish"}{" "}
                  <Check size={16} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function AdminCatalogPage() {
  const { profile, config } = useAuth();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("local");
  const [editor, setEditor] = useState<Game | "new" | null>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const catalog = useResource<Catalog>(
    profile?.admin ? `/games?q=${encodeURIComponent(search)}` : null,
  );
  const provider = useResource<{
    games: {
      id: number;
      title: string;
      platforms: string[];
      release_year: number | null;
    }[];
  }>(
    profile?.admin && providerSearch
      ? `/admin/catalog/search?q=${encodeURIComponent(providerSearch)}`
      : null,
  );
  async function importGame(id: number) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const result = await api<{ id: string; existing?: boolean }>(
        "/admin/catalog/import",
        json("POST", { igdb_id: id }),
      );
      setMessage(
        result.existing
          ? "This game already exists in the catalog."
          : "Game imported. It starts with no ratings or reviews.",
      );
      catalog.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }
  return (
    <AdminShell>
      <PageTitle
        eyebrow="KEEP THE GAME INDEX GROWING"
        title="CATALOG MANAGEMENT."
        action={
          <Button onClick={() => setEditor("new")}>
            Add game manually <Plus size={16} />
          </Button>
        }
      >
        <p>
          Edit existing games or import verified game information from IGDB.
        </p>
      </PageTitle>
      <div className="tabs">
        <button
          className={mode === "local" ? "active" : ""}
          onClick={() => setMode("local")}
        >
          Existing catalog
        </button>
        <button
          className={mode === "provider" ? "active" : ""}
          onClick={() => setMode("provider")}
        >
          Import from IGDB
        </button>
      </div>
      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      {mode === "local" ? (
        <>
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <Search size={20} />
            <input
              aria-label="Find a catalog entry"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the existing catalog..."
            />
            <Button type="submit">Search</Button>
          </form>
          {catalog.loading ? (
            <Loading />
          ) : catalog.error ? (
            <ErrorState message={catalog.error} retry={catalog.reload} />
          ) : (
            <div className="panel admin-catalog-list">
              {catalog.data?.games.map((game) => (
                <div key={game.id}>
                  <div>
                    <Link to={`/games/${game.id}`}>
                      <h3>{game.title}</h3>
                    </Link>
                    <span className="muted">{game.platforms.join(" / ")}</span>
                  </div>
                  <Button
                    className="compact white"
                    onClick={() => setEditor(game)}
                  >
                    Edit <PencilLine size={14} />
                  </Button>
                </div>
              ))}
              {catalog.data?.games.length === 0 && (
                <EmptyState title="NO MATCHING GAMES." />
              )}
              {(catalog.data?.pages ?? 0) > 1 && (
                <div className="field-help">
                  Showing the first 12 matches. Refine your search to find a
                  specific game.
                </div>
              )}
            </div>
          )}
        </>
      ) : !config?.catalog_import_enabled ? (
        <div className="panel">
          <EmptyState
            title="CONNECT THE FREE GAME CATALOG."
            icon={<Download size={36} />}
          >
            <p>
              Add your IGDB/Twitch application credentials to the server
              configuration to enable search and import. You can already add
              games manually and approve community suggestions.
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              setProviderSearch(query);
            }}
          >
            <Search size={20} />
            <input
              aria-label="Search IGDB"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              minLength={2}
              maxLength={100}
              placeholder="Search IGDB for a game..."
              required
            />
            <Button type="submit">Search IGDB</Button>
          </form>
          {provider.loading ? (
            <Loading />
          ) : provider.error ? (
            <ErrorState message={provider.error} retry={provider.reload} />
          ) : provider.data ? (
            <div className="panel admin-catalog-list">
              {provider.data.games.map((game) => (
                <div key={game.id}>
                  <div>
                    <h3>{game.title}</h3>
                    <p className="muted">
                      {game.release_year} · {game.platforms.join(" / ")}
                    </p>
                  </div>
                  <Button
                    className="white compact"
                    disabled={busy !== null}
                    onClick={() => void importGame(game.id)}
                  >
                    {busy === game.id ? "Importing..." : "Import"}{" "}
                    <Download size={15} />
                  </Button>
                </div>
              ))}
              {!provider.data.games.length && (
                <EmptyState title="NO CATALOG MATCHES." />
              )}
            </div>
          ) : (
            <div className="panel">
              <EmptyState title="SEARCH THE WORLD OF GAMES.">
                <p>
                  Imports include metadata and artwork. Community scores always
                  start from zero ratings.
                </p>
              </EmptyState>
            </div>
          )}
        </>
      )}
      {editor && (
        <AdminGameEditor
          game={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            catalog.reload();
            setMessage("Game metadata saved.");
          }}
        />
      )}
    </AdminShell>
  );
}
function AdminGameEditor({
  game,
  onClose,
  onSaved,
}: {
  game: Game | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(game?.title ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [platforms, setPlatforms] = useState(game?.platforms.join(", ") ?? "");
  const [genres, setGenres] = useState(game?.genres.join(", ") ?? "");
  const [release, setRelease] = useState(game?.release_date ?? "");
  const [developer, setDeveloper] = useState(game?.developer ?? "");
  const [publisher, setPublisher] = useState(game?.publisher ?? "");
  const [cover, setCover] = useState(game?.cover_url ?? "");
  const [hero, setHero] = useState(game?.hero_url ?? "");
  const [steam, setSteam] = useState(String(game?.steam_app_id ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        game ? `/admin/games/${game.id}` : "/admin/games",
        json(game ? "PUT" : "POST", {
          title,
          description,
          platforms: platforms
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          genres: genres
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          release_date: release,
          developer,
          publisher,
          cover_url: cover,
          hero_url: hero,
          steam_app_id: steam || null,
        }),
      );
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={game ? "EDIT GAME METADATA." : "ADD A GAME."}
      onClose={onClose}
    >
      <form onSubmit={(e) => void submit(e)}>
        <label>
          Game title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={2}
            maxLength={140}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={20}
            maxLength={5000}
            rows={4}
            required
          />
        </label>
        <label>
          Platforms, separated by commas
          <input
            value={platforms}
            onChange={(e) => setPlatforms(e.target.value)}
            placeholder="PC, PS5, Android"
            required
          />
        </label>
        <label>
          Genres, separated by commas
          <input value={genres} onChange={(e) => setGenres(e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            Release date/year
            <input
              value={release}
              onChange={(e) => setRelease(e.target.value)}
              placeholder="YYYY-MM-DD or YYYY"
              maxLength={10}
            />
          </label>
          <label>
            Developer
            <input
              value={developer}
              maxLength={140}
              onChange={(e) => setDeveloper(e.target.value)}
            />
          </label>
        </div>
        <label>
          Publisher
          <input
            value={publisher}
            maxLength={140}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </label>
        <label>
          Cover image URL or local image path
          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            maxLength={1000}
          />
        </label>
        <label>
          Hero image URL or local image path
          <input
            value={hero}
            onChange={(e) => setHero(e.target.value)}
            maxLength={1000}
          />
        </label>
        {game && (
          <label>
            Steam app ID <span className="optional">optional</span>
            <input
              type="number"
              min={1}
              step={1}
              value={steam}
              onChange={(e) => setSteam(e.target.value)}
            />
          </label>
        )}
        {error && <Alert type="error">{error}</Alert>}
        <div className="form-actions">
          <Button type="button" className="white" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save game"} <Save size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminSettingsPage() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useResource<Overview>(
    profile?.admin ? "/admin/overview" : null,
  );
  const [minimum, setMinimum] = useState("1");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (data) setMinimum(String(data.minimum_ratings));
  }, [data]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError("");
    setSaved(false);
    try {
      await api(
        "/admin/settings",
        json("PUT", { minimum_ratings: Number(minimum) }),
      );
      setSaved(true);
      reload();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell>
      <PageTitle
        eyebrow="LET THE COMMUNITY SET THE SCORES"
        title="RANKING SETTINGS."
      >
        <p>Control eligibility without changing anyone’s rating.</p>
      </PageTitle>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <form
          className="panel ranking-settings"
          onSubmit={(e) => void submit(e)}
        >
          <div className="panel-bar">TOP 50 ELIGIBILITY</div>
          <div className="form-body">
            <label>
              Minimum number of ratings per game
              <input
                type="number"
                value={minimum}
                min={1}
                max={100000}
                step={1}
                onChange={(e) => {
                  setMinimum(e.target.value);
                  setSaved(false);
                }}
                required
              />
            </label>
            <p>
              Use 1 during launch so a game qualifies after its first rating.
              Raise this later as the community grows.
            </p>
            <Alert>
              Rankings use average community scores. Ties use rating count, then
              title. Changing eligibility never edits or deletes user ratings.
            </Alert>
            {saveError && <Alert type="error">{saveError}</Alert>}
            {saved && (
              <Alert type="success">Ranking eligibility updated.</Alert>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save ranking settings"} <Save size={16} />
            </Button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
