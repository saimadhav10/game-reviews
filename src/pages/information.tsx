import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Shield } from "lucide-react";
import {
  Alert,
  Breadcrumbs,
  Button,
  EmptyState,
  PageTitle,
} from "../components";

const pages: Record<
  string,
  {
    eyebrow: string;
    title: string;
    sections: { title: string; text: string }[];
  }
> = {
  guidelines: {
    eyebrow: "STRONG OPINIONS. RESPECTFUL PEOPLE.",
    title: "THE COMMUNITY CODE.",
    sections: [
      {
        title: "Talk about the game.",
        text: "Share your experience and explain your opinion. Critique gameplay, storytelling, performance, and design. Personal attacks, harassment, hate, and spam do not belong here.",
      },
      {
        title: "Keep spoilers behind the curtain.",
        text: "Wrap spoilers in >!spoiler text!< or use the spoiler tool in the review editor. Conceal story reveals, endings, and unexpected moments so other players can discover them for themselves.",
      },
      {
        title: "One player. One score. One review.",
        text: "Each account can submit one editable score and one written review per game. Scores may include one decimal place. A written review is optional when submitting a rating.",
      },
      {
        title: "Vote on the contribution.",
        text: "Use upvotes for contributions you find worthwhile, and downvotes for contributions you find unhelpful. You can change or remove your vote. Do not coordinate votes or create extra accounts to manipulate scores.",
      },
      {
        title: "Approval comes before publication.",
        text: "Admins review written reviews, replies, and missing-game suggestions before they appear publicly. Scores publish immediately. When an approved review is edited, its approved version remains visible until the revision is approved.",
      },
      {
        title: "Your public identity is your choice.",
        text: "Anonymous mode applies across your public profile and contributions. Your public activity still belongs to the same profile. Administrators can identify the submitting account to moderate the community.",
      },
      {
        title: "Every platform belongs.",
        text: "PC, console, and mobile gamers are welcome. Steam linking is optional. No playtime proof is required to rate, review, or discuss a game.",
      },
    ],
  },
  help: {
    eyebrow: "A LITTLE HELP GETTING STARTED",
    title: "HOW GAMEREVIEWS WORKS.",
    sections: [
      {
        title: "Find a game and rate it.",
        text: "Search or browse the catalog, open a game, and choose “Rate this game.” Sign in and verify your email to publish a score from 0 to 10. You can use one decimal place and change the score later.",
      },
      {
        title: "Write a review or join a discussion.",
        text: "Choose “Write a review” on a game page, or open an approved review to reply. Written content goes to the admin queue before it appears publicly. Track its status in My Contributions.",
      },
      {
        title: "Understand the Top 50.",
        text: "Games are ranked by their average GameReviews score. More ratings break a tie, followed by game title. During launch, a single rating qualifies a game. Admins can raise that threshold as participation grows.",
      },
      {
        title: "Discover daily highlights.",
        text: "Reviews and comments published in the last 24 hours qualify when they receive positive net votes during that window. Net votes are upvotes minus downvotes. Highlights update as the rolling window changes.",
      },
      {
        title: "Change your public identity.",
        text: "Open Account Settings to edit your display name or enable anonymous mode. The choice affects existing and future public contributions across the website.",
      },
      {
        title: "Suggest a missing game.",
        text: "Search first to avoid duplicates, then use Suggest a Game. Give the title, platforms, and description, plus a reference link if available. An admin checks the suggestion before adding it.",
      },
      {
        title: "Recover your account.",
        text: "Use “Forgot password” on the sign-in page for email/password accounts. If you registered through Google, continue using Google sign-in.",
      },
    ],
  },
  privacy: {
    eyebrow: "PUBLIC IDENTITY AND PRIVATE ACCOUNT DATA",
    title: "PRIVACY INFORMATION.",
    sections: [
      {
        title: "What is public.",
        text: "Your public profile, ratings, approved reviews, and approved replies can be read without an account. Anonymous mode replaces your public display name with “Anonymous Gamer.” Your activity remains grouped under your public profile.",
      },
      {
        title: "What stays in your account.",
        text: "Your email, authentication identity, pending or rejected submissions, and optional linked Steam ID are not returned by public profile or contribution endpoints. Administrators have access to submission ownership for moderation.",
      },
      {
        title: "Services used by this website.",
        text: "The application is designed to use Firebase for authentication and Cloudflare for hosting and database storage. Optional catalog imports use IGDB. Optional Steam linking redirects you to Steam to authenticate. Your Steam password is not entered into GameReviews.",
      },
      {
        title: "Owner policy details still required.",
        text: "Before public launch, the website owner must supply the operator identity, contact information, retention and deletion procedures, applicable regional details, and the complete privacy policy. This page currently documents application behavior and is not a finalized legal policy.",
      },
    ],
  },
  terms: {
    eyebrow: "WEBSITE TERMS",
    title: "TERMS OF USE.",
    sections: [
      {
        title: "Community participation.",
        text: "Use the community guidelines when submitting ratings, reviews, replies, or game suggestions. Written submissions are reviewed by admins before publication.",
      },
      {
        title: "Community scores.",
        text: "GameReviews scores represent ratings submitted by this community. They are opinions rather than guarantees of game quality. External game metadata is separate from community ratings.",
      },
      {
        title: "Owner terms still required.",
        text: "The website owner must provide finalized terms covering the operator, contact details, account rules, content permissions, dispute handling, and applicable jurisdiction before public launch. This is a draft page structure, not a finalized legal agreement.",
      },
    ],
  },
};
export function InformationPage({ name }: { name: string }) {
  const page = pages[name];
  return (
    <>
      <Breadcrumbs items={[{ label: page.title.replace(".", "") }]} />
      <PageTitle eyebrow={page.eyebrow} title={page.title} />
      {["privacy", "terms"].includes(name) && (
        <Alert>
          Draft information page. Owner-specific policy details have not been
          finalized.
        </Alert>
      )}
      <div className="information-layout">
        <article className="panel information-content">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}
        </article>
        <aside className="panel yellow info-aside">
          <Shield size={30} />
          <h3>
            GOOD GAMES.
            <br />
            GOOD COMPANY.
          </h3>
          <p>Help make this a place worth coming back to.</p>
          <Button className="white" to="/games">
            Explore games <ArrowRight size={16} />
          </Button>
          <Link className="text-link" to="/guidelines">
            Read the community code →
          </Link>
        </aside>
      </div>
    </>
  );
}
export function NotFoundPage() {
  return (
    <div className="panel not-found">
      <span className="giant-404">404</span>
      <EmptyState
        title="THIS LEVEL DOESN’T EXIST."
        icon={<Gamepad2 size={40} />}
        action={
          <Button to="/">
            Back to home <ArrowRight size={17} />
          </Button>
        }
      >
        <p>
          The page may have moved. There are plenty of games back at the start.
        </p>
      </EmptyState>
    </div>
  );
}
