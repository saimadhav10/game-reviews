# GameReviews

The initial product serves PC, console, and mobile gamers. It is a persistent community application, not a static mockup. Visual references live in `uiassets/`; the application uses GameReviews branding.

## Agreed behavior

- Email/password and Google accounts. An account and verified email are required to contribute.
- Optional profile-wide public anonymity; administrators retain submission ownership for moderation.
- One editable score per account/game, from 0 to 10 in 0.1 increments. Scores publish immediately; written reviews are optional.
- One text review per account/game, with text-only threaded replies. No separate forums or user media uploads.
- Admin approval for reviews, replies, review revisions, and user-suggested games. Previously approved review content remains public during pending or rejected revisions.
- Spoiler concealment with Reddit-style `>!text!<`; `||text||` is also supported.
- One upvote or downvote per account/contribution; votes can be changed or removed.
- Top 50 uses only this site's average ratings. Ties use rating count descending, then title alphabetically. The initial eligibility threshold is one rating, adjustable by an admin.
- Daily reviews/comments use a rolling 24-hour window. Approved contributions published within that window qualify when their active votes cast within that window have a positive net total. Ties use publication time.
- Existing game catalog, free IGDB metadata imports, and admin-approved missing-game suggestions. External review scores are never imported.
- Optional Steam account linking through OpenID. No playtime requirement, ownership gate, personal Top 10 ballots, or weighted ballot ranking.
- No paid services or automatic plan upgrades. Hosting and authentication target free quotas.

## Delivery limits

Live Firebase authentication requires the owner's Firebase project configuration and enabling its providers. IGDB import requires the owner's free Twitch application credentials. Steam linking is implemented, but no PlayStation verification integration is claimed. Owner-specific legal policy details remain drafts.
