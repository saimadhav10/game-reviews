import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Flame,
  Gamepad2,
  ListFilter,
  MessageSquare,
  Plus,
  Search,
  SlidersHorizontal,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  Alert,
  Author,
  Breadcrumbs,
  Button,
  EmptyState,
  ErrorState,
  GameCard,
  GameImage,
  Loading,
  PageTitle,
  ReviewCard,
  Score,
  SectionTitle,
  SpoilerText,
  VoteControls,
  relativeTime,
} from "../components";
import { useResource } from "../lib/useResource";
import type { Catalog, Game, Highlights, HomeData } from "../types";

export function HomePage() {
  const { identity } = useAuth();
  const { data, error, loading, reload } = useResource<HomeData>(
    "/home",
    identity?.uid,
  );
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={reload} />;
  const featured = data.highlights.reviews[0];
  const comment = data.highlights.comments[0];
  return (
    <>
      <div className="community-ticker">
        <span className="ticker-label">COMMUNITY NOTICE</span>
        <span>
          THE RANKINGS START WITH YOU.{" "}
          <span className="ticker-detail">
            Only ratings submitted on GameReviews count.
          </span>
        </span>
        <span className="ticker-live">
          <i /> COMMUNITY POWERED
        </span>
      </div>
      <section className="home-hero">
        <div className="hero-main panel">
          <div className="hero-eyebrows">
            <span className="badge red">EVERY PLATFORM. EVERY PLAYER.</span>
            <span className="badge">INDEPENDENT OPINIONS</span>
          </div>
          <h1>
            YOUR GAMES.
            <br />
            <span className="highlight-text">YOUR VERDICT.</span>
          </h1>
          <p>
            A great game deserves a conversation. Honest ratings, passionate
            reviews, and opinions from the people who actually play.
          </p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }}
          >
            <div>
              <Search size={20} />
              <input
                aria-label="Search the game catalog"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a game. Make your point."
              />
            </div>
            <Button type="submit">
              Explore <ArrowRight size={19} />
            </Button>
          </form>
          <div className="platform-filter-strip">
            <span>YOUR PLATFORM:</span>
            {["PC", "PS5", "Xbox Series", "Switch", "Android", "iOS"].map(
              (p) => (
                <Link key={p} to={`/games?platform=${encodeURIComponent(p)}`}>
                  {p === "Android" ? "ANDROID" : p.toUpperCase()}
                </Link>
              ),
            )}
          </div>
        </div>
        <aside className="hero-side">
          <div className="have-your-say panel yellow">
            <MessageSquare size={27} />
            <div>
              <h2>HAVE YOUR SAY.</h2>
              <p>That game you can’t stop thinking about? We want your take.</p>
            </div>
            <Button className="black" to="/games">
              Rate a game <ArrowUpRight size={18} />
            </Button>
            {!identity && (
              <Button className="white" to="/register">
                Join the community <Plus size={16} />
              </Button>
            )}
          </div>
          <div className="community-stats panel">
            <div>
              <strong>{data.stats.games}</strong>
              <span>GAMES</span>
            </div>
            <div>
              <strong>{data.stats.ratings}</strong>
              <span>RATINGS</span>
            </div>
            <div>
              <strong>{data.stats.reviews}</strong>
              <span>REVIEWS</span>
            </div>
          </div>
        </aside>
      </section>
      <section className="home-section">
        <SectionTitle title="Daily highlights" icon={<Flame size={21} />}>
          <span className="badge">
            <Clock3 size={12} /> COMMUNITY VOTES / LAST 24H
          </span>
        </SectionTitle>
        <div className="daily-grid">
          <div>
            {featured ? (
              <ReviewCard review={featured} featured />
            ) : (
              <div className="panel daily-empty">
                <div className="panel-bar">THE COMMUNITY SPOTLIGHT</div>
                <EmptyState
                  title="The next great take could be yours."
                  icon={<MessageSquare size={36} />}
                  action={
                    <Button to="/games">
                      Write the first review <ArrowRight size={17} />
                    </Button>
                  }
                >
                  <p>
                    Approved reviews with the most community votes in the last
                    24 hours earn this spot. Get the conversation started.
                  </p>
                </EmptyState>
              </div>
            )}
          </div>
          <aside className="daily-sidebar">
            <div className="comment-spotlight panel yellow">
              <div className="eyebrow">
                COMMENT OF THE DAY <span className="quote-mark">”</span>
              </div>
              {comment ? (
                <>
                  <SpoilerText text={comment.body} />
                  <Author
                    id={comment.author_id}
                    name={comment.author_name}
                    anonymous={comment.author_anonymous}
                  />
                  <Link
                    to={`/reviews/${comment.review_id}#comment-${comment.id}`}
                    className="text-link"
                  >
                    {comment.game_title} <ArrowRight size={16} />
                  </Link>
                </>
              ) : (
                <>
                  <h3>GOOD CONVERSATIONS START WITH ONE COMMENT.</h3>
                  <p>
                    Once the votes are in, the community’s favorite reply will
                    appear here.
                  </p>
                </>
              )}
            </div>
            <div className="panel tip-panel">
              <ShieldIcon />
              <p>
                <strong>Your opinion, your identity.</strong>
                <br />
                Switch on anonymous mode in your account settings whenever you
                want.
              </p>
            </div>
            <Link className="text-link all-highlights" to="/highlights">
              Explore all daily highlights <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </section>
      <section className="home-section">
        <SectionTitle title="Community Top 50" icon={<Trophy size={21} />}>
          <Button to="/top-50" className="compact">
            Full leaderboard <ArrowRight size={15} />
          </Button>
        </SectionTitle>
        {data.ranked.length ? (
          <div className="game-grid four">
            {data.ranked.map((game, i) => (
              <GameCard game={game} rank={i + 1} key={game.id} />
            ))}
          </div>
        ) : (
          <div className="panel rankings-empty">
            <div className="empty-rank">
              #<span>1</span>
            </div>
            <div>
              <span className="eyebrow">A LEADERBOARD BUILT BY PLAYERS</span>
              <h3>FIRST PLACE IS STILL UP FOR GRABS.</h3>
              <p>
                No imported scores. No made-up rankings. Your ratings will
                decide which games make the cut.
              </p>
            </div>
            <Button to="/games">
              Cast your first rating <ArrowRight size={17} />
            </Button>
          </div>
        )}
      </section>
      <section className="home-section">
        <SectionTitle
          title="Fresh from the community"
          icon={<MessageSquare size={21} />}
        >
          <Link to="/games" className="text-link">
            Find a game to review <ArrowRight size={15} />
          </Link>
        </SectionTitle>
        {data.recent.length ? (
          <div className="review-grid">
            {data.recent.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title="No reviews. Plenty of opinions waiting."
              action={
                <Button to="/games" className="white">
                  Find your game <ArrowRight size={17} />
                </Button>
              }
            >
              <p>
                Reviews appear here after an admin approves them. Pick a game
                and tell the community what you think.
              </p>
            </EmptyState>
          </div>
        )}
      </section>
      <section className="home-section">
        <SectionTitle title="Fresh in the catalog" icon={<Plus size={21} />}>
          <Link to="/games?sort=added" className="text-link">
            Browse all {data.stats.games} games <ArrowRight size={15} />
          </Link>
        </SectionTitle>
        <div className="game-grid four">
          {data.added.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        <div className="missing-game-banner panel">
          <div>
            <span className="eyebrow">SOMETHING MISSING?</span>
            <h3>EVERY GAME DESERVES A PLACE HERE.</h3>
            <p>Indie obsession or mobile favorite—help the catalog grow.</p>
          </div>
          <Button to="/suggest-game">
            Suggest a missing game <Plus size={17} />
          </Button>
        </div>
      </section>
    </>
  );
}
function ShieldIcon() {
  return <span className="tip-icon">!</span>;
}

export function CatalogPage({ search = false }: { search?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [mobileFilters, setMobileFilters] = useState(false);
  const queryString = params.toString();
  const { data, error, loading, reload } = useResource<Catalog>(
    `/games?${queryString}`,
  );
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  const activeFilters = ["platform", "genre", "year"].filter((key) =>
    params.get(key),
  );
  return (
    <>
      <Breadcrumbs
        items={[{ label: search ? "Search results" : "Browse games" }]}
      />
      <PageTitle
        eyebrow="THE GAME INDEX"
        title={
          search
            ? params.get("q")
              ? `Results for “${params.get("q")}”`
              : "Find your next conversation."
            : "ALL GAMES. ALL OPINIONS."
        }
        action={
          <Button to="/suggest-game" className="white">
            Suggest a game <Plus size={16} />
          </Button>
        }
      >
        <p>
          {search
            ? "Find the game you’re looking for, then get into the details."
            : "From your latest obsession to the classics. Find a game and leave your mark."}
        </p>
      </PageTitle>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          update("q", query);
        }}
      >
        <Search size={23} />
        <input
          aria-label="Search catalog"
          placeholder="Search games by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit">
          Search <ArrowRight size={17} />
        </Button>
      </form>
      <div className="catalog-layout">
        <aside
          className={`filter-sidebar panel ${mobileFilters ? "filters-open" : ""}`}
        >
          <div className="panel-bar">
            <span>
              <SlidersHorizontal size={15} /> REFINE YOUR SEARCH
            </span>
            <button
              className="text-button"
              onClick={() => {
                setParams(params.get("q") ? { q: params.get("q")! } : {});
              }}
            >
              Reset
            </button>
          </div>
          <div className="filter-fields">
            {[
              ["platform", "Platform", data?.platforms],
              ["genre", "Genre", data?.genres],
              ["year", "Release year", data?.years],
            ].map(([key, label, choices]) => (
              <label key={String(key)}>
                {String(label)}
                <select
                  value={params.get(String(key)) ?? ""}
                  onChange={(e) => update(String(key), e.target.value)}
                >
                  <option value="">
                    All {key === "year" ? "years" : `${String(key)}s`}
                  </option>
                  {(choices as string[] | undefined)?.map((choice) => (
                    <option key={choice}>{choice}</option>
                  ))}
                </select>
              </label>
            ))}
            <div className="filter-note">
              <Gamepad2 size={25} />
              <p>
                Every platform belongs here.
                <br />
                Your next favorite might surprise you.
              </p>
            </div>
          </div>
        </aside>
        <div className="catalog-results">
          <div className="results-toolbar">
            <span>
              {loading ? (
                "Searching..."
              ) : (
                <>
                  <strong>{data?.total ?? 0}</strong> games found
                </>
              )}
            </span>
            <button
              className="filter-mobile-button button compact white"
              onClick={() => setMobileFilters(!mobileFilters)}
            >
              <ListFilter size={16} /> Filters{" "}
              {activeFilters.length > 0 && `(${activeFilters.length})`}
            </button>
            <label className="sort-label">
              SORT BY{" "}
              <select
                aria-label="Sort games"
                value={params.get("sort") ?? "title"}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="title">Title A–Z</option>
                <option value="rating">Highest rated</option>
                <option value="popular">Most rated</option>
                <option value="newest">Release date</option>
                <option value="added">Recently added</option>
              </select>
            </label>
          </div>
          {activeFilters.length > 0 && (
            <div className="active-filters">
              {activeFilters.map((key) => (
                <button
                  key={key}
                  className="badge"
                  onClick={() => update(key, "")}
                >
                  {params.get(key)} <X size={13} />
                </button>
              ))}
            </div>
          )}
          {error ? (
            <ErrorState message={error} retry={reload} />
          ) : loading && !data ? (
            <Loading />
          ) : data?.games.length ? (
            <>
              <div className={`game-grid ${loading ? "refreshing" : ""}`}>
                {data.games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
              {data.pages > 1 && (
                <div className="pagination">
                  <Button
                    className="white compact"
                    disabled={data.page <= 1}
                    onClick={() => update("page", String(data.page - 1))}
                  >
                    ← Previous
                  </Button>
                  <span>
                    PAGE {data.page} OF {data.pages}
                  </span>
                  <Button
                    className="white compact"
                    disabled={data.page >= data.pages}
                    onClick={() => update("page", String(data.page + 1))}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="panel">
              <EmptyState
                title="No games matched that search."
                icon={<Search size={33} />}
                action={
                  <Button to="/suggest-game">
                    Suggest the missing game <Plus size={16} />
                  </Button>
                }
              >
                <p>
                  Try another title or remove a filter. If the game isn’t here
                  yet, suggest it for admin approval.
                </p>
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function RankingsPage() {
  const { data, error, loading, reload } = useResource<{
    games: Game[];
    minimum: number;
  }>("/top-50");
  return (
    <>
      <Breadcrumbs items={[{ label: "Community Top 50" }]} />
      <PageTitle
        eyebrow="RANKED BY THE PEOPLE WHO PLAY"
        title="THE COMMUNITY TOP 50."
        action={
          <div className="leaderboard-seal">
            <Trophy size={29} />
            <span>
              100%
              <br />
              COMMUNITY SCORES
            </span>
          </div>
        }
      >
        <p>
          Fifty places. Countless opinions. The games our community rates
          highest—across every platform.
        </p>
      </PageTitle>
      <div className="ranking-method panel">
        <span className="badge black">HOW IT WORKS</span>
        <p>
          Ranked by average rating out of 10. Ties are broken by rating count,
          then game title.
        </p>
        <span className="badge">
          {data?.minimum === 1
            ? "OPEN RANKINGS · 1+ RATING"
            : `${data?.minimum ?? "…"} RATINGS TO QUALIFY`}
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error} retry={reload} />
      ) : data.games.length ? (
        <>
          <div className="podium-grid">
            {data.games.slice(0, 3).map((game, i) => (
              <GameCard key={game.id} game={game} rank={i + 1} />
            ))}
          </div>
          {data.games.length > 3 && (
            <div className="leaderboard-list panel">
              {data.games.slice(3).map((game, i) => (
                <Link
                  key={game.id}
                  to={`/games/${game.id}`}
                  className="leaderboard-row"
                >
                  <strong className="list-rank">
                    #{String(i + 4).padStart(2, "0")}
                  </strong>
                  <div className="list-art">
                    <GameImage game={game} />
                  </div>
                  <div className="list-game-info">
                    <h3>{game.title}</h3>
                    <p>{game.platforms.slice(0, 4).join(" / ")}</p>
                  </div>
                  <div className="list-rating-count">
                    {game.rating_count.toLocaleString()}
                    <small>RATINGS</small>
                  </div>
                  <Score score={game.rating} small />
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </div>
          )}
          {data.games.length < 50 && (
            <Alert>
              Only {data.games.length}{" "}
              {data.games.length === 1 ? "game qualifies" : "games qualify"} so
              far. The list will grow as the community rates more games.
            </Alert>
          )}
        </>
      ) : (
        <div className="panel">
          <EmptyState
            title="EVERY LEADERBOARD NEEDS A FIRST VOTE."
            icon={<Trophy size={45} />}
            action={
              <Button to="/games">
                Rate your first game <ArrowRight size={18} />
              </Button>
            }
          >
            <p>
              There are no qualifying ratings yet. Games enter the rankings as
              soon as they receive{" "}
              {data.minimum === 1
                ? "their first rating"
                : `${data.minimum} ratings`}
              .
            </p>
          </EmptyState>
        </div>
      )}
    </>
  );
}

export function HighlightsPage() {
  const { identity } = useAuth();
  const [tab, setTab] = useState("reviews");
  const { data, error, loading, reload } = useResource<Highlights>(
    "/highlights",
    identity?.uid,
  );
  return (
    <>
      <Breadcrumbs items={[{ label: "Daily highlights" }]} />
      <PageTitle
        eyebrow="THE COMMUNITY HAS SPOKEN"
        title="TAKES WORTH YOUR TIME."
        action={
          <span className="badge">
            <Clock3 size={15} /> ROLLING 24 HOURS
          </span>
        }
      >
        <p>
          The reviews and replies earning the most net upvotes in the last 24
          hours. Chosen by you.
        </p>
      </PageTitle>
      <div className="tabs" role="tablist" aria-label="Highlight type">
        <button
          role="tab"
          aria-selected={tab === "reviews"}
          className={tab === "reviews" ? "active" : ""}
          onClick={() => setTab("reviews")}
        >
          <Flame size={17} />
          Reviews of the day
        </button>
        <button
          role="tab"
          aria-selected={tab === "comments"}
          className={tab === "comments" ? "active" : ""}
          onClick={() => setTab("comments")}
        >
          <MessageSquare size={17} />
          Comments of the day
        </button>
      </div>
      <div className="highlight-explainer">
        Only approved contributions published in the last 24 hours qualify. Net
        votes = upvotes − downvotes cast in that window. Positive net votes are
        required.
      </div>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState message={error} retry={reload} />
      ) : tab === "reviews" ? (
        data.reviews.length ? (
          <div className="highlight-review-list">
            {data.reviews.map((review, i) => (
              <div key={review.id}>
                <div className="highlight-rank">
                  #{String(i + 1).padStart(2, "0")}{" "}
                  <span>{review.daily_votes} NET VOTES / 24H</span>
                </div>
                <ReviewCard review={review} featured={i === 0} />
              </div>
            ))}
          </div>
        ) : (
          <div className="panel">
            <EmptyState
              title="THE SPOTLIGHT IS OPEN."
              icon={<Flame size={38} />}
              action={
                <Button to="/games">
                  Explore games <ArrowRight size={17} />
                </Button>
              }
            >
              <p>
                There are no qualifying reviews yet. Write a review, or vote on
                a recent one you think deserves to be seen.
              </p>
            </EmptyState>
          </div>
        )
      ) : data.comments.length ? (
        <div className="highlight-comments">
          {data.comments.map((comment, i) => (
            <article className="panel comment-highlight" key={comment.id}>
              <div className="panel-bar">
                <span>#{i + 1} / COMMUNITY COMMENT</span>
                <span>{comment.daily_votes} NET VOTES</span>
              </div>
              <div className="comment-highlight-body">
                <SpoilerText text={comment.body} />
                <Author
                  id={comment.author_id}
                  name={comment.author_name}
                  anonymous={comment.author_anonymous}
                />
                <p className="muted">
                  {relativeTime(comment.published_at)} · {comment.game_title}
                </p>
                <div className="review-actions">
                  <VoteControls
                    type="comment"
                    id={comment.id}
                    votes={comment.votes}
                    myVote={comment.my_vote}
                  />
                  <Link
                    className="text-link"
                    to={`/reviews/${comment.review_id}#comment-${comment.id}`}
                  >
                    Read the discussion <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title="GIVE A GOOD COMMENT ITS MOMENT."
            icon={<MessageSquare size={38} />}
            action={
              <Button to="/games">
                Find a discussion <ArrowRight size={17} />
              </Button>
            }
          >
            <p>
              Community favorites will appear once recent approved comments
              receive positive net votes.
            </p>
          </EmptyState>
        </div>
      )}
    </>
  );
}
