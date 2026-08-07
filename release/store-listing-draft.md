# Saturated store listing draft

## Positioning

**App name:** Saturated

**Apple subtitle:** Discover and rate drinks

**Google Play short description:** Discover drinks, log flavour notes, share reviews and follow trusted buddies.

## Full description

Saturated is a social beverage-discovery app for adults. Explore a growing catalogue of drinks, save beverages to your Drinklist, record half-star ratings and flavour notes, and keep your tasting history in a shareable receipt-style profile.

Follow buddies to discover what they are trying, read community reviews, join conversations and unlock badges as your tasting history grows. Search beverages and profiles, request missing drinks, and use reporting and blocking controls to keep your experience comfortable.

Saturated does not sell alcohol. Users must be 18 or older, and local purchase and consumption laws always apply.

### Main features

- Browse and search the beverage catalogue
- Rate drinks with half stars and write flavour-led reviews
- Save drinks to a personal Drinklist
- Follow buddies and see relevant activity
- Comment on and like community reviews
- Track reviews in a receipt-style profile
- Earn progress badges
- Report content or users and block unwanted interactions
- Export or delete account data from Settings

## Apple keywords

drinks,beverages,reviews,ratings,beer,wine,cocktails,coffee,flavour,social

## Screenshot sequence

Use real production data with test accounts, no personal information, and no empty-state screens.

1. Explore — caption: **Find your next favourite drink**
2. Drink profile — caption: **Ratings and flavour notes in one place**
3. Write review — caption: **Log every sip your way**
4. Feed — caption: **See what your buddies are trying**
5. Profile receipt — caption: **Keep your tasting history**
6. Drinklist — caption: **Save drinks for later**
7. Badges — caption: **Unlock milestones as you explore**

Apple accepts one to ten screenshots. Prepare a 6.9-inch iPhone set at an accepted portrait size. The current Figma/device target can use 1290 x 2796 px. Screenshots must be JPEG/JPG/PNG without transparency.

For Google Play, prepare two to eight portrait phone screenshots and a 1024 x 500 px feature graphic. Use a 9:16 phone set at high resolution, with the same visual story and localized text for every supported language.

## Age-rating answers

- App-enforced minimum account age: **18+**
- Alcohol references: **Yes; frequent/prominent catalogue and discussion**
- User-generated content: **Yes**
- Social/networking features: **Yes**
- Content reporting and user blocking: **Yes**
- Alcohol sales or purchases: **No**
- Gambling or simulated gambling: **No**
- Unrestricted web access: **No**

Let App Store Connect and Play Console calculate the storefront rating from truthful questionnaire answers. Do not describe the entire app as 21+: Saturated is not a retailer, while United States alcohol-purchase rules are 21+ and local laws apply everywhere.

## Content-rights declaration

Before declaring that Saturated has the necessary rights, retain a licence/source record for every:

- beverage image and product photograph;
- logo, brand mark and label artwork;
- font, icon, texture and sound asset;
- marketing screenshot or promotional graphic.

The developer should only confirm the store content-rights declaration after every catalogue image is owned, commissioned, licensed, supplied under a compatible licence, or replaced. Product names may be factual catalogue information, but brand imagery still needs a defensible usage basis.

## Privacy-form working inventory

Review the final binary and every SDK before submission. Based on the current app, disclose:

| Store data category          | Saturated examples                                                   | Main purpose                          | Required?                                     |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| Contact/personal information | Email, first and last name, username                                 | Account management                    | Required except provider-supplied name fields |
| Other personal information   | Date of birth                                                        | 18+ eligibility                       | Required                                      |
| Photos                       | Optional profile picture                                             | User profile                          | Optional                                      |
| User-generated content       | Reviews, ratings, flavour tags, comments, drink requests and reports | App functionality and safety          | Optional/feature-dependent                    |
| User IDs                     | Supabase account and profile IDs                                     | Authentication and account management | Required                                      |
| App activity                 | Likes, follows, Drinklist, badges and feed events                    | App functionality and personalization | Feature-dependent                             |
| Diagnostics/security         | Authentication logs, session and abuse-prevention records            | Security and fraud prevention         | Required where generated                      |
| Location                     | None currently; add only if local discovery is implemented           | Personalization                       | Not currently collected                       |

Current intended declaration: data is encrypted in transit, users can export and delete their data, data is not sold, and no cross-app advertising tracking is used. Recheck those statements whenever analytics, advertising, crash-reporting or location SDKs are added.

## Submission URLs

- Privacy policy: `https://suppixie.github.io/Saturated-App/privacy/`
- Terms: `https://suppixie.github.io/Saturated-App/terms/`
- Community guidelines: `https://suppixie.github.io/Saturated-App/community-guidelines/`
- Support: `https://suppixie.github.io/Saturated-App/support/`
- Account deletion: `https://suppixie.github.io/Saturated-App/delete-account/`

These URLs must not be submitted until the legal controller name and support email are filled, the legal-site validator passes, and GitHub Pages has deployed them.
