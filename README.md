# Saturated

Saturated is an Expo/React Native drink discovery and review app backed by
Supabase.

## Code map

- `App.tsx` owns application state, navigation, authentication, and screen
  composition.
- `src/types.ts` contains shared app models such as drinks, reviews, profiles,
  and route names.
- `src/theme.ts` contains colours, fonts, frame measurements, and glass-effect
  tokens.
- `src/styles.ts` contains the shared React Native style sheet.
- `src/data/seedData.ts` contains offline/demo drinks, reviews, comments, and
  profiles used when backend data is unavailable.
- `src/data/catalogueImages.ts` is generated from the catalogue workbook. Its
  static `require` calls allow Metro to include every transparent PNG in native
  builds.
- `lib/` contains Supabase authentication and database operations.
- `supabase/` contains the database schema and migrations.

## Catalogue images

The source workbook stores images as embedded PNG files. Extract them and
rebuild the native image manifest with:

```powershell
npm run catalogue:images -- -WorkbookPath "C:\path\to\final catalogue.xlsx"
```

The generated images are written to `assets/drinks/catalog/`. Do not edit
`src/data/catalogueImages.ts` manually; rerun the extraction command instead.

## Development

```powershell
npm install
npm start
```
