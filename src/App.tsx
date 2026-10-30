import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { Alert, ErrorState, Footer, Header } from "./components";
import {
  CatalogPage,
  HighlightsPage,
  HomePage,
  RankingsPage,
} from "./pages/discovery";
import { GamePage, ReviewEditorPage, ReviewPage } from "./pages/game";
import {
  AuthActionPage,
  AuthenticationPage,
  ContributionsPage,
  PublicProfilePage,
  SettingsPage,
  SuggestGamePage,
  VerifyEmailPage,
} from "./pages/account";
import {
  AdminCatalogPage,
  AdminModerationPage,
  AdminOverviewPage,
  AdminSettingsPage,
} from "./pages/admin";
import { InformationPage, NotFoundPage } from "./pages/information";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Keep account data out of client error logging. */
  }
  render() {
    return this.state.failed ? (
      <ErrorState
        message="The page could not be displayed. Reload to try again."
        retry={() => window.location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const { profile, config, error } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Your games. Your verdict.",
      "/games": "Browse games",
      "/top-50": "Community Top 50",
      "/highlights": "Daily highlights",
      "/sign-in": "Sign in",
      "/register": "Join the community",
      "/settings": "Account settings",
      "/admin": "Admin dashboard",
      "/contributions": "My contributions",
    };
    document.title = `GameReviews — ${titles[location.pathname] ?? "Community game reviews"}`;
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      {config?.emulator && (
        <div className="local-notice">
          LOCAL DEVELOPMENT · Accounts and contributions are stored locally.
          This is not the live website.
        </div>
      )}
      <main id="main-content" className="main-container">
        <Boundary key={location.pathname}>
          {error && <Alert type="error">{error}</Alert>}
          {profile && !profile.verified && (
            <Alert>
              Verify your email to publish ratings and submit contributions.{" "}
              <Link to="/verify-email">Check verification →</Link>
            </Alert>
          )}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games" element={<CatalogPage />} />
            <Route path="/search" element={<CatalogPage search />} />
            <Route path="/games/:id" element={<GamePage />} />
            <Route path="/games/:id/review" element={<ReviewEditorPage />} />
            <Route path="/reviews/:id" element={<ReviewPage />} />
            <Route path="/top-50" element={<RankingsPage />} />
            <Route path="/highlights" element={<HighlightsPage />} />
            <Route
              path="/sign-in"
              element={<AuthenticationPage mode="sign-in" />}
            />
            <Route
              path="/register"
              element={<AuthenticationPage mode="register" />}
            />
            <Route
              path="/forgot-password"
              element={<AuthenticationPage mode="forgot" />}
            />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/action" element={<AuthActionPage />} />
            <Route path="/profiles/:id" element={<PublicProfilePage />} />
            <Route path="/contributions" element={<ContributionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/suggest-game" element={<SuggestGamePage />} />
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/moderation" element={<AdminModerationPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            {["guidelines", "help", "privacy", "terms"].map((name) => (
              <Route
                key={name}
                path={`/${name}`}
                element={<InformationPage name={name} />}
              />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Boundary>
      </main>
      <Footer />
    </>
  );
}
