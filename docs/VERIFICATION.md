# Verification

Verified on 2026-10-30.

## Completed

- TypeScript type checking passes.
- Production Vite build passes.
- Worker deployment dry run passes against the production configuration.
- **23 automated tests pass** using a real local Firebase Auth emulator and isolated D1 storage.
- Local HTTP checks return 200 for the homepage, configuration, home data, and mobile-platform catalog filtering.
- The development and hosted databases contain 14 real game metadata records and no seeded community scores, reviews, or votes.
- Local administrator setup succeeds without creating a production account.
- Local environment files, credentials, dependency directories, and runtime database state are ignored by Git.

## Tested behavior

Authentication and project/session boundaries; guest/admin permissions; verified-email requirements; decimal rating validation and updates; average ranking and tie-breaking; ranking thresholds; pending-review privacy; approval and review revision handling; stale moderation decisions; pending and nested replies; unique, changeable votes; existing vote selection on different pages; rolling 24-hour highlight eligibility; consistent anonymous identity; game-suggestion approval/rejection; safe metadata URLs; manual catalog editing; optional Steam initiation and callback-state rejection; body limits and cross-origin write rejection; concealed spoilers and escaped user HTML.

## Not yet verified

- Browser visual inspection and interactive browser checks: the session's browser host and native computer-use pipe are unavailable. No visual screenshot verification is claimed.
- Production email delivery, real Google sign-in, and the full live moderation journey: Firebase owner sign-in and project/provider setup are pending.
- Live IGDB import: requires the owner's Twitch application credentials.
- A real Steam login round trip: initiation and callback rejection are tested, but a user has not completed Steam sign-in in this session.
- GitHub-hosted CI results must be checked after pushing.

The privacy and terms pages are clearly identified drafts requiring owner-specific information. The Firebase emulator simulates authentication during local development; it is blocked on public hosts.
