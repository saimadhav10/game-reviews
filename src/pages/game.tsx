import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  Gamepad2,
  MessageSquare,
  PencilLine,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  Alert,
  Author,
  AuthGuard,
  Breadcrumbs,
  Button,
  EmptyState,
  ErrorState,
  GameImage,
  Loading,
  Modal,
  PageTitle,
  ReviewCard,
  Score,
  SectionTitle,
  SpoilerText,
  StatusBadge,
  VoteControls,
  relativeTime,
} from "../components";
import { api, errorMessage, json } from "../lib/api";
import { useResource } from "../lib/useResource";
import type { Comment, GameDetail, Review } from "../types";

function ScoreInput({
  score,
  onChange,
}: {
  score: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="score-input-group">
      <div className="score-input-display">
        <input
          type="number"
          aria-label="Your rating out of 10"
          min="0"
          max="10"
          step="0.1"
          value={score}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <span>/ 10</span>
      </div>
      <input
        aria-label="Adjust rating"
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={score || 0}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="range-labels">
        <span>0 · NOT FOR ME</span>
        <span>10 · ALL-TIME FAVORITE</span>
      </div>
    </div>
  );
}

function RatingModal({
  game,
  current,
  onClose,
  onSaved,
}: {
  game: GameDetail["game"];
  current: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [score, setScore] = useState(current?.toFixed(1) ?? "7.0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/games/${game.id}/rating`,
        json("PUT", { score: Number(score) }),
      );
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={current == null ? "YOUR VERDICT." : "UPDATE YOUR VERDICT."}
      onClose={onClose}
    >
      {saved ? (
        <div className="rating-success">
          <Check size={40} />
          <h3>YOUR RATING IS LIVE.</h3>
          <p>Your score is now part of the community average.</p>
          <Button onClick={onClose}>
            Back to the game <ArrowRight size={16} />
          </Button>
          <Link
            to={`/games/${game.id}/review`}
            onClick={onClose}
            className="text-link"
          >
            Want to say more? Write a review.
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)}>
          <div className="rating-game">
            <div className="rating-game-art">
              <GameImage game={game} />
            </div>
            <div>
              <span className="eyebrow">
                {current == null
                  ? "RATE THIS GAME"
                  : "YOUR CURRENT SCORE: " + current.toFixed(1)}
              </span>
              <h3>{game.title}</h3>
            </div>
          </div>
          <ScoreInput score={score} onChange={setScore} />
          <p className="muted">
            A score is enough. No written review or playtime proof required. You
            can edit your rating later.
          </p>
          {error && <Alert type="error">{error}</Alert>}
          <div className="form-actions">
            <Button className="white" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || score === ""} type="submit">
              {busy
                ? "Saving..."
                : current == null
                  ? "Publish rating"
                  : "Update rating"}{" "}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function GamePage() {
  const { id } = useParams();
  const { identity } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [ratingOpen, setRatingOpen] = useState(false);
  const { data, loading, error, reload } = useResource<GameDetail>(
    `/games/${id}?sort=${sort}&page=${page}`,
    identity?.uid,
  );
  useEffect(() => {
    if (identity && params.get("rate") === "1") setRatingOpen(true);
  }, [identity, params]);
  function rate() {
    if (!identity)
      navigate(`/sign-in?next=${encodeURIComponent(`/games/${id}?rate=1`)}`);
    else setRatingOpen(true);
  }
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={reload} />;
  const { game } = data;
  const maxDistribution = Math.max(1, ...data.distribution.map((x) => x.count));
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Browse games", to: "/games" }, { label: game.title }]}
      />
      <section className="game-hero panel">
        <div className="game-hero-art">
          <GameImage game={game} hero />
          <span className="badge game-art-label">THE GAME FILE</span>
        </div>
        <div className="game-hero-info">
          <div className="hero-eyebrows">
            {game.genres.map((genre) => (
              <span className="badge" key={genre}>
                {genre}
              </span>
            ))}
          </div>
          <h1>{game.title}</h1>
          <p>{game.description}</p>
          <div className="game-platforms">
            {game.platforms.map((p) => (
              <span className="badge black" key={p}>
                {p}
              </span>
            ))}
          </div>
          <div className="game-primary-actions">
            <Button onClick={rate}>
              <Star size={17} />{" "}
              {data.my_rating == null
                ? "Rate this game"
                : `Your score: ${Number(data.my_rating).toFixed(1)}`}{" "}
              <ArrowRight size={17} />
            </Button>
            <Button to={`/games/${id}/review`} className="white">
              <PencilLine size={17} />{" "}
              {data.my_review ? "Edit your review" : "Write a review"}
            </Button>
          </div>
        </div>
      </section>
      <section className="community-verdict panel">
        <div>
          <span className="eyebrow">THE GAMEREVIEWS COMMUNITY VERDICT</span>
          <div className="verdict-label">
            <h2>
              {game.rating == null
                ? "THE VERDICT IS YOURS."
                : "THE PLAYERS HAVE SPOKEN."}
            </h2>
            <p>
              {game.rating_count.toLocaleString()}{" "}
              {game.rating_count === 1 ? "rating" : "ratings"} ·{" "}
              {game.review_count}{" "}
              {game.review_count === 1 ? "review" : "reviews"}
              {data.rank && (
                <Link to="/top-50">
                  <Trophy size={14} /> #{data.rank} in the Top 50
                </Link>
              )}
            </p>
          </div>
        </div>
        <Score score={game.rating} />
      </section>
      {data.my_review && data.my_review.status !== "approved" && (
        <Alert type={data.my_review.status === "rejected" ? "error" : "info"}>
          <strong>
            {data.my_review.status === "pending"
              ? "Your review is awaiting approval."
              : "Your submission needs a revision."}
          </strong>
          {data.my_review.published_at
            ? " Your approved version remains visible."
            : " It will appear publicly after approval."}
          {data.my_review.reason && (
            <p>Admin feedback: {data.my_review.reason}</p>
          )}{" "}
          <Link to={`/games/${id}/review`}>Open your review →</Link>
        </Alert>
      )}
      <div className="game-content-grid">
        <div>
          <SectionTitle
            title="The community conversation"
            icon={<MessageSquare size={20} />}
          >
            <label className="sort-label">
              SORT{" "}
              <select
                aria-label="Sort reviews"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="recent">Newest first</option>
                <option value="votes">Top voted</option>
              </select>
            </label>
          </SectionTitle>
          <div className="review-list">
            {data.reviews.length ? (
              data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} showGame={false} />
              ))
            ) : (
              <div className="panel">
                <EmptyState
                  title="YOU PLAYED IT. NOW TALK ABOUT IT."
                  icon={<MessageSquare size={35} />}
                  action={
                    <Button to={`/games/${id}/review`}>
                      Write the first review <PencilLine size={16} />
                    </Button>
                  }
                >
                  <p>
                    No approved reviews yet. Share what worked, what didn’t, and
                    what stayed with you.
                  </p>
                </EmptyState>
              </div>
            )}
          </div>
          {game.review_count > 12 && (
            <div className="pagination">
              <Button
                className="white compact"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Previous
              </Button>
              <span>
                {page} / {Math.ceil(game.review_count / 12)}
              </span>
              <Button
                className="white compact"
                disabled={page >= Math.ceil(game.review_count / 12)}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </div>
        <aside className="game-sidebar">
          <div className="panel">
            <div className="panel-bar">THE SCORE BREAKDOWN</div>
            <div className="rating-distribution">
              {Array.from({ length: 11 }, (_, index) => 10 - index).map(
                (bucket) => {
                  const count =
                    data.distribution.find((x) => x.bucket === bucket)?.count ??
                    0;
                  return (
                    <div className="distribution-row" key={bucket}>
                      <span>
                        {bucket}
                        {bucket < 10 ? "–" + (bucket + 0.9).toFixed(1) : ""}
                      </span>
                      <div className="distribution-track">
                        <i
                          style={{
                            width: `${(count / maxDistribution) * 100}%`,
                          }}
                        />
                      </div>
                      <span>{count}</span>
                    </div>
                  );
                },
              )}
              {!game.rating_count && (
                <p className="muted">
                  No scores yet. Yours could be the first.
                </p>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-bar">GAME DETAILS</div>
            <dl className="game-facts">
              {[
                ["Developer", game.developer],
                ["Publisher", game.publisher],
                ["Released", game.release_date],
                ["Genre", game.genres.join(", ")],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <div className="panel yellow conversation-rules">
            <ShieldCheck size={26} />
            <h3>
              STRONG OPINIONS.
              <br />
              GOOD CONVERSATIONS.
            </h3>
            <p>Review the game. Respect the player. Hide your spoilers.</p>
            <Link to="/guidelines" className="text-link">
              Community guidelines <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
      {ratingOpen && (
        <RatingModal
          game={game}
          current={data.my_rating}
          onSaved={reload}
          onClose={() => {
            setRatingOpen(false);
            if (params.has("rate")) {
              params.delete("rate");
              setParams(params, { replace: true });
            }
          }}
        />
      )}
    </>
  );
}

export function ReviewEditorPage() {
  const { id } = useParams();
  const { identity } = useAuth();
  const resource = useResource<GameDetail>(`/games/${id}`, identity?.uid);
  return (
    <AuthGuard>
      {resource.loading ? (
        <Loading />
      ) : resource.error || !resource.data ? (
        <ErrorState message={resource.error} retry={resource.reload} />
      ) : (
        <ReviewEditor data={resource.data} />
      )}
    </AuthGuard>
  );
}
function ReviewEditor({ data }: { data: GameDetail }) {
  const own = data.my_review;
  const [title, setTitle] = useState(own?.pending_title ?? own?.title ?? "");
  const [body, setBody] = useState(own?.pending_body ?? own?.body ?? "");
  const [platform, setPlatform] = useState(
    own?.pending_platform ?? own?.platform ?? data.game.platforms[0] ?? "Other",
  );
  const [withRating, setWithRating] = useState(data.my_rating != null);
  const [score, setScore] = useState(data.my_rating?.toFixed(1) ?? "7.0");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  function spoiler() {
    const element = editor.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    setBody(
      body.slice(0, start) +
        ">!" +
        (body.slice(start, end) || "spoiler text") +
        "!<" +
        body.slice(end),
    );
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + 2, end > start ? end + 2 : start + 14);
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/games/${data.game.id}/review`,
        json("PUT", {
          title,
          body,
          platform,
          score: withRating ? Number(score) : null,
        }),
      );
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { label: data.game.title, to: `/games/${data.game.id}` },
          { label: own ? "Edit review" : "Write a review" },
        ]}
      />
      <PageTitle
        eyebrow="YOUR EXPERIENCE. YOUR WORDS."
        title={own ? "REFINE YOUR TAKE." : "MAKE YOUR POINT."}
      >
        <p>One game. One review. A perspective only you can bring.</p>
      </PageTitle>
      {submitted ? (
        <div className="panel">
          <EmptyState
            title="YOUR REVIEW IS IN THE QUEUE."
            icon={<ShieldCheck size={42} />}
            action={
              <div className="form-actions">
                <Button to="/contributions">
                  Track your submission <ArrowRight size={17} />
                </Button>
                <Button className="white" to={`/games/${data.game.id}`}>
                  Back to the game
                </Button>
              </div>
            }
          >
            <p>
              An admin will review your submission before it goes live.
              {own?.published_at
                ? " Your previously approved version remains public."
                : ""}
              {withRating ? " Your rating is already live." : ""}
            </p>
          </EmptyState>
        </div>
      ) : (
        <form className="review-editor-layout" onSubmit={(e) => void submit(e)}>
          <div className="panel editor-panel">
            <div className="panel-bar">
              <span>{own ? "EDIT YOUR REVIEW" : "WRITE YOUR REVIEW"}</span>
              {own && <StatusBadge status={own.status} />}
            </div>
            <div className="form-body">
              <div className="rating-game">
                <div className="rating-game-art">
                  <GameImage game={data.game} />
                </div>
                <div>
                  <span className="eyebrow">YOU’RE REVIEWING</span>
                  <h2>{data.game.title}</h2>
                </div>
              </div>
              {own?.reason && (
                <Alert type="error">Admin feedback: {own.reason}</Alert>
              )}
              <label>
                Review title
                <input
                  value={title}
                  minLength={3}
                  maxLength={140}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your take a headline."
                  required
                />
              </label>
              <label>
                Platform played
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {[...new Set([...data.game.platforms, "Other"])].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <div className="editor-toolbar">
                <strong>Your review</strong>
                <div>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setPreview(!preview)}
                  >
                    <Eye size={15} /> {preview ? "Edit text" : "Preview"}
                  </button>
                  <button
                    type="button"
                    className="text-button spoiler-tool"
                    onClick={spoiler}
                    disabled={preview}
                  >
                    Hide spoiler
                  </button>
                </div>
              </div>
              {preview ? (
                <div className="editor-preview">
                  <SpoilerText
                    text={body || "Your preview will appear here."}
                  />
                </div>
              ) : (
                <textarea
                ref={editor}
                aria-label="Your review"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  minLength={20}
                  maxLength={10000}
                  rows={12}
                  placeholder="What did you love? What didn’t land? What should another player know?"
                  required
                />
              )}
              <div className="field-help">
                <span>
                  Select text and choose “Hide spoiler,” or wrap it in
                  &gt;!spoiler text!&lt;.
                </span>
                <span>{body.length.toLocaleString()} / 10,000</span>
              </div>
              {error && <Alert type="error">{error}</Alert>}
              <Alert>
                All written reviews require admin approval. Your score publishes
                immediately. Keep spoilers concealed and the conversation
                respectful.
              </Alert>
              <div className="form-actions">
                <Button className="white" to={`/games/${data.game.id}`}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy || body.trim().length < 20 || title.trim().length < 3
                  }
                >
                  {busy ? "Submitting..." : "Submit for approval"}{" "}
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </div>
          <aside>
            <div className="panel">
              <div className="panel-bar">YOUR SCORE</div>
              <div className="form-body">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={withRating}
                    onChange={(e) => setWithRating(e.target.checked)}
                  />
                  Include a rating
                </label>
                {withRating && <ScoreInput score={score} onChange={setScore} />}
                <p className="muted">
                  Decimal scores are welcome. Your score remains editable.
                </p>
              </div>
            </div>
            <div className="panel yellow writing-tips">
              <h3>A GOOD REVIEW GOES BEYOND A NUMBER.</h3>
              <ul>
                <li>Talk about your own experience.</li>
                <li>Explain what worked and why.</li>
                <li>Keep major spoilers concealed.</li>
                <li>Critique the game, respect the players.</li>
              </ul>
            </div>
          </aside>
        </form>
      )}
    </>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const { identity } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sort, setSort] = useState("recent");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shared, setShared] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useResource<{ review: Review; comments: Comment[] }>(
    `/reviews/${id}?sort=${sort}`,
    identity?.uid,
  );
  useEffect(() => {
    if (data && location.hash)
      requestAnimationFrame(() =>
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ block: "center" }),
      );
  }, [data, location.hash]);
  function reply(comment: Comment) {
    if (!identity) {
      navigate(`/sign-in?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setReplyTo(comment);
    setSuccess(false);
    composer.current?.focus();
    document
      .getElementById("reply-composer")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/reviews/${id}/comments`,
        json("POST", { body, parent_id: replyTo?.id ?? null }),
      );
      setSuccess(true);
      setBody("");
      setReplyTo(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(
        location.pathname ? window.location.href : "",
      );
      setShared("Link copied.");
    } catch {
      setShared("Copy the page URL from your browser to share this review.");
    }
  }
  if (loading && !data) return <Loading />;
  if (loadError || !data)
    return <ErrorState message={loadError} retry={reload} />;
  const review = data.review;
  const ids = new Set(data.comments.map((c) => c.id));
  function renderComments(parent: string | null, depth = 0): React.ReactNode {
    return data!.comments
      .filter((comment) =>
        parent === null
          ? !comment.parent_id || !ids.has(comment.parent_id)
          : comment.parent_id === parent,
      )
      .map((comment) => (
        <div
          key={comment.id}
          className={`comment-thread ${depth > 0 ? "nested" : ""}`}
        >
          <article id={`comment-${comment.id}`} className="comment-card">
            <div className="review-author-row">
              <Author
                id={comment.author_id}
                name={comment.author_name}
                anonymous={comment.author_anonymous}
              />
              <span className="muted">
                {relativeTime(comment.published_at)}
              </span>
            </div>
            <SpoilerText text={comment.body} />
            <div className="comment-actions">
              <VoteControls
                id={comment.id}
                type="comment"
                votes={comment.votes}
                myVote={comment.my_vote}
              />
              <button className="text-button" onClick={() => reply(comment)}>
                <MessageSquare size={14} />
                Reply
              </button>
              <Link
                className="muted"
                to={`#comment-${comment.id}`}
                aria-label="Link to this comment"
              >
                #
              </Link>
            </div>
          </article>
          {renderComments(comment.id, depth + 1)}
        </div>
      ));
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { label: review.game_title, to: `/games/${review.game_id}` },
          { label: "Review & discussion" },
        ]}
      />
      <div className="review-detail-layout">
        <div>
          <article className="panel full-review">
            <div className="panel-bar">
              <Link to={`/games/${review.game_id}`}>{review.game_title}</Link>
              <span>COMMUNITY REVIEW</span>
            </div>
            <div className="full-review-body">
              <div className="review-heading">
                <h1>{review.title}</h1>
                {review.score != null && <Score score={review.score} />}
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
              <span className="badge">{review.platform}</span>
              <SpoilerText text={review.body} />
              <div className="review-actions">
                <VoteControls
                  id={review.id}
                  type="review"
                  votes={review.votes}
                  myVote={review.my_vote}
                />
                <span className="discussion-link">
                  <MessageSquare size={16} />
                  {review.reply_count} replies
                </span>
                <button className="text-button" onClick={() => void share()}>
                  <Share2 size={15} />
                  Share
                </button>
              </div>
              {shared && (
                <p role="status" className="field-help">
                  {shared}
                </p>
              )}
            </div>
          </article>
          <section className="discussion-section">
            <SectionTitle
              title={`The discussion (${review.reply_count})`}
              icon={<MessageSquare size={20} />}
            >
              <label className="sort-label">
                SORT{" "}
                <select
                  aria-label="Sort comments"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Oldest first</option>
                  <option value="votes">Top voted</option>
                </select>
              </label>
            </SectionTitle>
            <div className="panel reply-composer" id="reply-composer">
              {identity ? (
                <form onSubmit={(e) => void submit(e)}>
                  <div className="composer-title">
                    <strong>
                      {replyTo
                        ? `Replying to ${replyTo.author_name}`
                        : "ADD YOUR VOICE."}
                    </strong>
                    {replyTo && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setReplyTo(null)}
                      >
                        Cancel reply
                      </button>
                    )}
                  </div>
                  {success && (
                    <Alert type="success">
                      Your reply is awaiting admin approval. Track it in{" "}
                      <Link to="/contributions">My Contributions</Link>.
                    </Alert>
                  )}
                  <textarea
                    aria-label="Your reply"
                    ref={composer}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setSuccess(false);
                    }}
                    minLength={2}
                    maxLength={3000}
                    rows={4}
                    placeholder="Add to the conversation. Keep spoilers in >!spoiler tags!<."
                    required
                  />
                  <div className="composer-footer">
                    <span className="muted">
                      Text only · Admin approval required
                    </span>
                    <Button
                      className="compact"
                      type="submit"
                      disabled={busy || body.trim().length < 2}
                    >
                      {busy ? "Submitting..." : "Submit reply"}{" "}
                      <Send size={14} />
                    </Button>
                  </div>
                  {error && <Alert type="error">{error}</Alert>}
                </form>
              ) : (
                <div className="signin-to-reply">
                  <div>
                    <h3>GOT SOMETHING TO ADD?</h3>
                    <p>Sign in to join the conversation.</p>
                  </div>
                  <Button
                    to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}
                  >
                    Sign in <ArrowRight size={15} />
                  </Button>
                </div>
              )}
            </div>
            <div className="comments-list">
              {data.comments.length ? (
                renderComments(null)
              ) : (
                <EmptyState title="THIS CONVERSATION IS JUST GETTING STARTED.">
                  <p>
                    Be the first to reply. Approved comments will appear here.
                  </p>
                </EmptyState>
              )}
            </div>
          </section>
        </div>
        <aside className="game-sidebar">
          <div className="panel yellow conversation-rules">
            <MessageSquare size={27} />
            <h3>
              DISAGREE WITH THE TAKE?
              <br />
              ADD YOURS.
            </h3>
            <p>
              A thoughtful reply makes the conversation better. Vote on the
              contribution, not the person.
            </p>
            <Button className="white" to={`/games/${review.game_id}/review`}>
              Write your review <PencilLine size={15} />
            </Button>
          </div>
          <Link className="back-game-link" to={`/games/${review.game_id}`}>
            <ArrowLeft size={16} />
            Back to {review.game_title}
          </Link>
        </aside>
      </div>
    </>
  );
}
