# Saturated: Product, Technical and Business Overview

**Document date:** 10 August 2026  
**Product owner / data controller:** Patalay Mamtha  
**Public support:** mamtha.dsgn@gmail.com  
**Platforms:** iOS, Android and a web-compatible Expo preview  
**Backend:** Supabase Auth, Postgres, Row Level Security and Storage

## 1. Executive summary

Saturated is a social beverage discovery and review application. It gives a
single product experience to people who want to discover drinks, remember what
they want to try, record what they have tasted, compare flavour impressions and
follow the activity of people whose taste they trust.

The product is broader than an alcohol-rating application. Its catalogue also
contains soft drinks, coffee, tea and other non-alcoholic beverages. Because
alcohol-related content is present, account creation is restricted to adults
aged 18 or over. This is a content-access rule, not a statement that every
beverage can legally be purchased at 18 in every territory. Actual alcohol
purchase and consumption laws remain location-specific.

The current application includes:

- email, Google and Apple authentication paths;
- account onboarding, age validation and profile identity;
- a curated beverage catalogue with search and category browsing;
- personalised, regional, seasonal and community-influenced discovery;
- a Drinklist for products the user wants to try;
- half-star ratings, written reviews and flavour notes;
- review editing and deletion;
- review likes, comments, threads and reporting;
- public profiles, follows/buddies, blocking and community activity;
- a receipt-style personal review history and shareable receipt artwork;
- progress-based badges;
- drink requests;
- privacy export and account deletion operations;
- a moderator queue for reports and safety actions;
- public legal, support, community-guideline and deletion pages.

Group Chats were prototyped and backed by database migrations, but the feature
is currently archived and removed from the active navigation. Its source and
database objects are retained so the feature can be reconsidered later.

## 2. Product vision

### 2.1 The problem

People discover drinks through friends, venues, shops, travel, social media and
menus, but the discovery is fragmented. Notes are lost, recommendations are not
personalised, and conventional rating platforms often reduce a drink to one
number without explaining flavour.

### 2.2 The Saturated proposition

Saturated combines three behaviours in one place:

1. **Discover:** find a drink that fits the user's taste, place or mood.
2. **Remember:** save it to a Drinklist or record it in the personal receipt.
3. **Connect:** see how buddies describe and rate it, then discuss reviews.

Flavour notes are the differentiator. An average rating answers whether people
liked a drink; flavour notes answer what the experience was like.

### 2.3 Primary audiences

- Curious consumers who want a low-friction tasting diary.
- Social drinkers who choose products through friends' recommendations.
- Coffee, tea and soft-drink enthusiasts as well as alcohol consumers.
- Travellers looking for beverages associated with a region.
- Venues and retailers that want to understand emerging consumer taste.
- Beverage brands seeking aggregated, consent-respecting product insight.

## 3. Complete page and feature inventory

### 3.1 Splash and welcome onboarding

The splash establishes the Saturated brand before the onboarding panel appears.
The welcome state explains that Saturated contains alcohol-related content and
is for adults aged 18 or over. A date of birth is collected for age validation.

The user can continue with Google, Apple or email, or start full email account
creation. Terms, privacy and community guidelines are presented before account
creation. Authentication screens use the platform safe area and keyboard-aware
layouts.

### 3.2 Create account

Email registration uses a full-screen form with:

- optional profile image;
- first and last name;
- chosen username;
- email address;
- password;
- date of birth;
- acceptance of terms and community guidelines.

The profile image is optional. If it is absent, the UI generates initials from
the person's display name. For Google or Apple accounts, the username defaults
to the portion of the email address before `@`, subject to unique-username
resolution in the database.

### 3.3 Sign in and password recovery

Returning email users enter only email and password. Password reset email and
password-update flows are supported. OAuth redirects return to Saturated through
the configured callback route.

### 3.4 Explore

Explore is the main discovery surface. It contains:

- horizontally scrollable beverage categories;
- **For You**, influenced by the signed-in user's positively rated categories
  and flavour notes;
- **Trending near [location]**, influenced by the selected area, beverage
  origin, regional drink associations, community activity and personal taste;
- **Seasonal Picks**, influenced by the current season and flavour vocabulary;
- **Browse All**, shuffled once per app session and refreshed only by an
  explicit pull-to-refresh;
- pagination in groups of 30 products.

Browse All preserves the selected filter and stable product order when the user
opens a drink and returns. Loading the next 30 waits for the active scrolling
interaction to settle, prefetches remote artwork and then renders the new items
in small batches. This deliberately trades a slightly longer visible loading
state for smoother scrolling and fewer dropped frames.

The selected discovery area is optional and stored locally. This avoids adding
signup friction and collecting location data before it is needed. Saturated does
not currently request precise GPS coordinates. A future version may add an
explicit, consent-based profile location or coarse city/country field.

### 3.5 Search

Search switches between beverages and profiles. Beverage search covers name,
category, brand and flavour tags. Profile search covers display name and
username.

Search begins after three letters and normalises:

- accents (`caffe` finds `Caffè`, `pina` finds `Piña`);
- punctuation and hyphens (`coca cola` finds `Coca-Cola`);
- compact spelling (`cocacola` finds `Coca-Cola`);
- reordered query words when every word is present.

The query, selected search mode, result list and scroll offset remain in place
when a drink is opened and the user returns. If a beverage is absent, the user
can open Request Drink with the current query prefilled.

### 3.6 Request Drink

The request screen accepts a beverage name and stores a pending request tied to
the signed-in user. Requests have pending, approved and rejected states in the
database. This is an important catalogue feedback loop and can later drive an
admin catalogue workflow.

### 3.7 Drinklist

Drinklist is the user's saved-to-try collection. It displays the saved count and
cards with consistent product-image sizing. Each card supports:

- opening the drink profile;
- removing the drink;
- opening the review composer directly;
- a limited set of flavour tags that stay within card boundaries.

The database uses a composite key of user and beverage, preventing duplicate
saves.

### 3.8 Drink profile

The drink profile provides:

- product image, category and average rating;
- consumer-facing brand, origin and description where available;
- official flavour tags supplied by the catalogue;
- user-derived flavour notes aggregated from reviews;
- Add to List / Saved state;
- Write a Review;
- the first five reviews, followed by View More when additional reviews exist;
- four smaller More Like This cards based on brand, category and flavour
  similarity.

When there are no reviews, the screen uses a lightweight prompt rather than an
empty glass card. The information card sizes itself to its content.

### 3.9 Review composer

Users can select ratings in half-star increments from 0.5 to 5.0, write a review
and choose established flavour notes. A custom flavour note can be created and
saved into the current review. Inputs are keyboard-aware so the active field and
primary action remain visible.

When editing an existing review, its rating, text and flavour notes are loaded
into the same page. The primary action becomes Save. A Delete Review action is
shown beside Save and removes the review from both the profile receipt and the
drink page. One user can have one review per beverage; saving again updates the
existing record.

### 3.10 Review cards and Review Thread

A review card displays the author, avatar, date, complete five-star visual,
numeric rating, written review, flavour notes, comment count and like count.

- Tapping the card opens Review Thread.
- Tapping the author identity opens that profile.
- Tapping Like updates the like without navigating away.
- Tapping Comments opens the thread.
- Reporting is available below the date for content that is not the user's own.

Review Thread contains the complete review and its comments. Comment authors
show their profile identity. The drink heading links back to the drink profile.
The thread intentionally does not show the main bottom navigation.

### 3.11 Feed

Feed is generated from real buddy activity rather than seed notifications. It
contains drinks reviewed by followed users, overlapping buddy avatars, review
activity and suggested profiles when the feed is empty. Following suggested
profiles creates the future feed.

The Group Chat entry point has been removed. The archived implementation is in
`src/archived/GroupChats.tsx`.

### 3.12 Own profile: Reviews

The own profile includes identity, username, member date and Edit Profile. It
shows:

- Drinks Tried;
- Average Rating;
- Buddies;
- a receipt-style review history.

Receipt rows contain item number, drink name, review date, edit action and one
star beside the numeric rating. Review text opens the review thread. The receipt
can be shared as a 9:16 image on a black background, using the top five ratings
for a concise social asset. An empty receipt prompts the user to try and review a
drink.

### 3.13 Own profile: Badges

The badges tab combines all achievements in one scrollable grid. Tapping a badge
opens a bottom sheet explaining the requirement. The sheet closes by dragging
down or tapping outside it.

Current achievement rules are:

| Badge                | Requirement                                     |
| -------------------- | ----------------------------------------------- |
| First Sip            | Review 1 drink                                  |
| Five Sips            | Review 5 drinks                                 |
| Ten Sips             | Review 10 drinks                                |
| Social Sipper        | Comment on 20 reviews by other users            |
| Wine much            | Review 10 wines                                 |
| Caffeine in my Blood | Review 10 coffee drinks                         |
| Around the World     | Review drinks from 10 distinct recorded origins |
| Pint Master          | Review 15 beers                                 |
| Cocktailio           | Review 15 cocktails                             |
| Always on the rocks  | Review 10 whiskeys/whiskies                     |
| The Drink Buddy      | Follow 20 profiles                              |
| Receipt Maxx         | Review 50 drinks                                |

### 3.14 Other user profiles

Other profiles replace Edit with Follow. They show that person's review history,
rating statistics and buddy count. The current user can follow, unfollow, block
or report a profile. Other users' reviews do not expose the owner's private edit
or receipt-sharing actions.

### 3.15 Settings and account details

Settings contains account details, GDPR/privacy operations, community safety,
Instagram, drink requests and logout. Account details are read-only until Edit
Profile is pressed. Saving can update display identity and avatar.

Privacy operations include data export and account deletion. Account deletion
is executed through a security-definer database function that removes the user's
account-related data and signs out the local session.

### 3.16 Moderation queue

Users can report profiles, reviews and comments. Moderators and admins can open a
queue of unresolved reports and resolve them with actions such as dismissing a
report, hiding content or suspending a profile. Moderation actions are recorded
for auditability.

## 4. Recommendation and discovery model

Saturated currently uses an explainable scoring model rather than a black-box
machine-learning model.

### 4.1 For You

The app examines the user's reviews rated 3.5 or higher. It builds weights from:

- flavour tags attached to those reviews;
- categories of positively rated drinks;
- product quality and review volume;
- community likes and comments.

Already reviewed products are excluded from For You.

### 4.2 Trending near a location

The regional score uses:

- direct matches between selected location and catalogue origin;
- curated associations for Ireland, the UK, the United States, Mexico, Italy,
  France, Spain, Germany, Czechia, Japan and India;
- regionally recognisable styles and brands;
- community review/like/comment activity;
- a smaller personal preference weight;
- a deterministic location/product diversity factor.

This is no longer a hard-coded list of displayed drinks. It is a generated rank
over the complete published catalogue. The curated data influences relevance,
while catalogue, community and user data decide the final result.

The next maturity step is server-side location analytics based on coarse,
consented city/country data. That would allow genuine local trends such as
"most reviewed in Dublin this week" rather than regional cultural relevance.

### 4.3 Seasonal Picks

Seasonal Picks uses the current month and flavour families such as refreshing,
citrus and tropical in summer; apple, spice and caramel in autumn; and warming,
coffee, chocolate and rich notes in winter.

## 5. Frontend architecture

The app is built with React Native and Expo. It targets one component model for
iOS and Android, with a responsive design frame that respects safe-area insets.

Important frontend packages include:

- Expo and React Native;
- Supabase JavaScript client;
- AsyncStorage for non-sensitive local preferences and navigation memory;
- Expo Image for memory/disk image caching;
- Expo Blur and Linear Gradient for glass surfaces;
- Expo Image Picker for profile images;
- React Native View Shot and Sharing for receipt images;
- Lucide icons and bundled Google fonts.

Navigation is currently state-driven inside the application rather than using a
dedicated router. Bottom-navbar transitions slide into place; ordinary back
navigation is immediate and preserves the previous screen's remembered scroll
position. This works for the current scope, but Expo Router or React Navigation
would be a sensible future refactor for deep-link scale, nested stacks and
automated navigation testing.

## 6. Supabase backend architecture

### 6.1 Authentication

Supabase Auth manages email/password sessions and OAuth with Google and Apple.
The app stores the Supabase session through the client library and reacts to auth
state changes. A profile row is created from the auth user through a database
trigger. Password recovery and OAuth callback handling are implemented.

The application must never contain a Supabase `service_role` key. Only the
publishable/anonymous client key belongs in the mobile build.

### 6.2 Database tables

| Table                                                                            | Purpose and important relationships                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`                                                                       | One-to-one with `auth.users`; username, display name, biography, avatar, date of birth verification, terms acceptance and suspension state |
| `beverages`                                                                      | Catalogue source of truth; category, subtype, brand, origin, description, image, official tags and publication state                       |
| `reviews`                                                                        | One review per user/beverage; half-star rating and written body                                                                            |
| `flavour_tags`                                                                   | Normalised, case-insensitive flavour vocabulary                                                                                            |
| `review_flavour_tags`                                                            | Many-to-many link between reviews and flavour tags                                                                                         |
| `review_likes`                                                                   | Unique user/review likes                                                                                                                   |
| `review_comments`                                                                | Thread comments tied to review and profile                                                                                                 |
| `review_images`                                                                  | Storage metadata for optional review images; current review UI does not expose upload                                                      |
| `drinklist`                                                                      | Composite user/beverage saved list                                                                                                         |
| `follows`                                                                        | Directed follower-to-following relationship                                                                                                |
| `drink_requests`                                                                 | User-submitted missing products and request status                                                                                         |
| `badges`                                                                         | Achievement definitions and targets                                                                                                        |
| `user_badges`                                                                    | Per-user progress and earned timestamp                                                                                                     |
| `user_roles`                                                                     | Operational `moderator` or `admin` role assignment                                                                                         |
| `user_blocks`                                                                    | Directed user blocking relationships                                                                                                       |
| `content_reports`                                                                | Reports against profiles, reviews or comments                                                                                              |
| `moderation_actions`                                                             | Audit trail of moderator decisions                                                                                                         |
| `group_chats`, `group_chat_members`, `group_chat_messages`, `group_chat_reports` | Retained schema for the archived Group Chats prototype                                                                                     |

Foreign keys generally cascade when a parent profile, beverage or review is
deleted, preventing orphaned social data.

### 6.3 Views

- `beverage_catalogue` returns published drinks with calculated average rating
  and review count.
- `review_details` combines a review with author identity, flavour notes, like
  count, comment count and image URLs.
- `moderation_queue` presents report targets in an operational review format.

### 6.4 Database functions

Important RPC functions include:

- `save_review` for insert/update review and tags;
- `toggle_review_like`;
- `toggle_drinklist`;
- `toggle_follow`;
- `refresh_my_badges`;
- `delete_my_account`;
- `accept_community_terms`;
- `block_user` and `unblock_user`;
- `submit_content_report` and `resolve_content_report`;
- `is_moderator` and `users_blocked` policy helpers;
- archived group membership and invite functions.

Security-definer functions use a locked search path and validate the current
authenticated user before privileged writes.

### 6.5 Storage

Three public-read buckets exist:

- `avatars`;
- `review-images`;
- `group-images` for the archived prototype.

Upload and management policies restrict writes to user-owned paths or records.
Profile image URLs are stored on the profile and reused across profiles, reviews
and comments.

### 6.6 Row Level Security

RLS is enabled on all 14 audited core tables. The policy model is:

- published catalogue and visible social content can be read publicly;
- private collections and requests are scoped to their owner;
- a user can update or delete their own content;
- blocked relationships prevent visibility where the policy applies;
- hidden or suspended content is removed from ordinary public reads;
- moderators can inspect content needed for the moderation queue;
- role assignment cannot be performed by an ordinary mobile client.

The 10 August permission repair allows anonymous public-read policies to execute
the safe boolean helpers `is_moderator()` and `users_blocked()`. Both helpers
return false for a signed-out user. This fixes the logout transition without
granting anonymous moderation powers.

## 7. Migration history and deployment state

The live project records all 13 local migrations:

1. `20260723000000_initial_schema`
2. `20260730000000_import_final_catalogue`
3. `20260730010000_production_operations`
4. `20260731010000_add_profile_date_of_birth`
5. `20260801000000_profile_identity_defaults`
6. `20260803000000_beverage_catalogue_created_at`
7. `20260803010000_badge_rules`
8. `20260803020000_archive_beverages_without_artwork`
9. `20260806000000_moderation_and_community_safety`
10. `20260810000000_add_vodka_and_rum_catalogue`
11. `20260810010000_group_chats`
12. `20260810020000_group_chat_management`
13. `20260810030000_fix_moderator_logout_permissions`

Live audit results on 10 August 2026:

- 13 migrations recorded;
- 14/14 required core tables present;
- 14/14 audited core tables have RLS enabled;
- 2/2 required views present;
- 13/13 required core RPC functions present;
- 3/3 storage buckets present;
- simulated anonymous access successfully returned 526 published beverages, 7
  reviews and 1 visible profile;
- anonymous `is_moderator(null)` correctly returned false.

## 8. Creating another admin account

Admin status must be assigned server-side. Do not create an admin toggle in the
mobile client and do not expose a service-role key.

### Recommended process

1. Ask the new administrator to create and confirm a normal Saturated account.
2. In Supabase Dashboard, open **Authentication → Users** and copy that user's
   UUID after verifying the email address.
3. Open **SQL Editor** using a trusted project-owner dashboard session.
4. Run the following with the verified UUID:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE-VERIFIED-USER-UUID-HERE', 'admin')
on conflict (user_id) do update
set role = excluded.role;
```

5. Verify the role:

```sql
select p.username, p.display_name, ur.role, ur.created_at
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
where ur.user_id = 'PASTE-VERIFIED-USER-UUID-HERE';
```

6. Ask the new admin to sign out and back in, then confirm that Moderation is
   visible in Settings.

To create a moderator instead, use `moderator` rather than `admin`. To revoke
access:

```sql
delete from public.user_roles
where user_id = 'PASTE-VERIFIED-USER-UUID-HERE';
```

Operational recommendations:

- maintain at least two trusted admins so one lost account does not block
  moderation;
- use unique accounts, never shared credentials;
- require strong passwords and enable MFA when available for admin identities;
- review `moderation_actions` and `user_roles` regularly;
- keep a written procedure for adding and removing staff access.

## 9. Privacy, GDPR and community safety

Patalay Mamtha is currently the public data controller. The privacy page should
continue to identify the controller, support contact, processing purposes,
retention approach, processors and user rights.

The product already exposes key user-rights operations:

- access/export of profile and activity data;
- correction through Account Details;
- deletion through Delete Account;
- blocking and reporting;
- public support and deletion instructions.

Before launch, operational practice must match the webpages. This includes:

- answering access/deletion requests within applicable legal timeframes;
- retaining only data needed for product, security or legal obligations;
- documenting Supabase and email providers as processors;
- keeping report data only as long as justified by community safety;
- avoiding precise location collection unless it has a clear purpose and
  explicit consent;
- maintaining a breach-response process;
- ensuring analytics and marketing SDKs are disclosed before they are added.

The 18+ gate should be described as access to alcohol-related content. Saturated
does not sell alcohol and should not imply that an app age gate replaces local
purchase laws.

## 10. Business model

### 10.1 Recommended launch model

Launch the consumer application free and without disruptive advertising. Early
growth depends on enough reviews, trustworthy recommendations and strong repeat
use. Monetising too early would reduce the quality of the social graph.

### 10.2 Potential revenue streams

1. **Affiliate commerce:** links to participating retailers where legally and
   geographically appropriate. Affiliate status must be clearly disclosed.
2. **Venue discovery and promotion:** paid featured venue placements, local
   tasting trails or menu integrations. Sponsored placement must never be
   presented as organic trending.
3. **Brand insight subscription:** aggregated, privacy-preserving dashboards for
   flavour-note trends, category sentiment and product comparison. Never sell
   identifiable user review histories.
4. **Verified brand pages:** brands pay for enriched product information,
   launch announcements and catalogue maintenance, while community ratings
   remain independent.
5. **Saturated Plus:** optional consumer subscription for advanced tasting
   statistics, private lists, export formats, collection tools and richer
   recommendations.
6. **Events and partnerships:** ticketed tastings, coffee trails, alcohol-free
   discovery events and venue collaborations.

### 10.3 Business-model guardrails

- Organic ranking and sponsored ranking must be visibly separate.
- Brands cannot pay to remove legitimate negative reviews.
- Alcohol marketing must be age-appropriate and comply with each territory.
- User data should be aggregated before commercial analysis.
- Recommendations should remain useful for non-alcoholic users.

## 11. Growth and launch strategy

### 11.1 Initial launch loop

Start with a focused geography such as Dublin rather than marketing globally on
day one. Seed the social graph with real local reviewers, bartenders, baristas,
students over 18, alcohol-free creators and venue staff. Give each person a clear
task: review five drinks, follow five people and share one receipt.

The core growth loop is:

1. user reviews a beverage;
2. receipt or review is shared;
3. another person opens or installs Saturated;
4. they follow the reviewer and save a drink;
5. their later review creates feed activity and another shareable asset.

### 11.2 Acquisition channels

- Instagram account `@saturated.app`;
- short-form tasting videos showing flavour notes rather than generic ratings;
- QR codes at partner cafés, bars and alcohol-free events;
- local launch lists such as "10 drinks to try in Dublin";
- creator collections and guest receipts;
- university/alumni communities with strict adult targeting;
- App Store optimisation around drink discovery, tasting journal, coffee,
  cocktails, beer and soft drinks.

### 11.3 Metrics

Measure activation and retention before revenue:

- account creation completion;
- percentage completing first review within 24 hours;
- follows per activated user;
- Drinklist saves per session;
- review completion rate;
- comments and likes per review;
- seven-day and thirty-day retention;
- receipt share rate;
- search queries with no result;
- drink request approval rate;
- report volume and moderation response time;
- recommendation click-through and subsequent review rate.

A practical activation definition is: **one review, three saved drinks and three
followed profiles within the first seven days**.

## 12. Current limitations and risks

- Google and Apple OAuth still depend on correct provider credentials, consent
  branding and production redirect configuration in their respective consoles.
- Production SMTP, confirmation links and password-reset redirects must be tested
  on physical iOS and Android devices before store submission.
- Regional discovery is culturally and metadata informed; it is not yet a live
  city-level popularity model.
- The catalogue source has 549 rows, while 526 have mapped artwork and are
  currently published/visible in the audited backend.
- Image-heavy Explore performance must be measured on lower-end Android devices,
  not only in Expo Go on the development phone.
- Navigation is state-based and would benefit from a formal router as deep links
  grow.
- Moderation exists, but catalogue approval and drink-request handling do not yet
  have a complete admin GUI.
- Group Chats are archived. Their database tables should remain dormant or be
  removed in a future cleanup migration if the feature is permanently cancelled.
- App Store and Play Store review can take longer than one day; technical
  readiness does not guarantee next-day public availability.

## 13. Recommended roadmap

### Phase 1: launch hardening

- complete physical-device OAuth, email-confirmation and reset tests;
- create the second admin account and moderation rota;
- run accessibility checks for contrast, dynamic text and screen readers;
- profile Explore memory and frame rate on a lower-end Android phone;
- complete store screenshots, privacy labels and age/content declarations;
- add crash reporting and privacy-respecting product analytics;
- establish database backups and a restore test.

### Phase 2: data quality and discovery

- build an admin catalogue/request workflow;
- add location metadata at city/country level only with explicit consent;
- generate genuine local trending windows from review events;
- improve aliases and fuzzy search with Postgres full-text/trigram search;
- add brand verification and product merge tools;
- flag duplicate or discontinued beverages.

### Phase 3: retention

- notifications for likes, comments, follows and badge achievements;
- private collections and themed Drinklists;
- richer user taste profiles and monthly summaries;
- venue check-ins without exposing precise location history;
- collaborative tasting events;
- optional Group Chat reconsideration after moderation capacity is proven.

### Phase 4: monetisation and B2B

- affiliate retailer experiments in one legally appropriate market;
- verified brand and venue pages;
- aggregate insight dashboards;
- premium consumer analytics;
- event and partnership revenue.

## 14. Testing and operational verification

The repository includes `npm run verify`, which currently checks:

- TypeScript compilation;
- configured legal-site contact details;
- unique IDs across 549 catalogue records;
- required catalogue fields;
- existence of 526 mapped image assets;
- unique and ordered local migration versions;
- presence of the latest logout-permission migration;
- search behaviour for punctuation, compact words, accents and the three-letter
  minimum.

The live Supabase audit should be rerun after every production migration. A
release should also require:

- Android and iOS production builds, not only Expo Go;
- authenticated and anonymous database smoke tests;
- sign-up, confirmation, sign-in, reset and logout tests;
- review create/edit/delete and tag tests;
- like/comment/follow/block/report tests using two non-admin accounts;
- moderation tests using a separate admin account;
- image upload and account deletion tests;
- poor-network and offline/retry tests;
- App Store/Play Store release-candidate testing.

## 15. Product definition in one sentence

**Saturated is a social tasting receipt and discovery network that helps adults
find beverages, describe flavour, remember what they tried and discover what
trusted people are drinking next.**
