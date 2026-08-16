# Tic Rush — Ionic Angular Tic Tac Toe

A fast, mobile-first Tic Tac Toe game built with Angular 20 + Ionic 8 + Capacitor 7.

## Game flow
- VS Computer: player X vs a fast AI. Every player win awards **10 coins** and advances one level.
- Team Match: local 2-player pass-and-play. **No coins** are awarded and level does not increase.
- Smart/Master AI uses tactical win/block logic plus center/corner priority without heavy search, keeping mobile play responsive.
- Progress is saved locally.

## Audio
- Sound effects and arcade music are generated with Web Audio API, so no large audio assets are bundled.
- Settings include sound, music and volume controls.
- Music starts after user interaction/navigation to respect mobile browser autoplay rules.

## Run
```bash
npm ci
ionic serve
```

## Production build
```bash
ng build
```

## Android
After extracting the project, install dependencies first:

```bash
npm ci
```

Then build the web app and create/sync the Android platform:

```bash
ng build
npx cap add android
npx cap sync android
npx cap open android
```

The Capacitor `webDir` is configured as `www`, matching Angular's production output. Do not create or copy an `android/` folder manually before running `npx cap add android`.


## Android / Capacitor build

Build the Angular app before copying web assets into Android:

```bash
ng build
npx cap add android
npx cap sync android
```

The Angular browser output is configured to be written directly to `www/index.html`, matching Capacitor `webDir: "www"`.

For an existing Android project, use `npm run cap:prepare`.
