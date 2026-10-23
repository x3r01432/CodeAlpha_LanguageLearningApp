# CodeAlpha Language Learning App

A Spanish learning app for English speakers, built with React Native and Expo for the CodeAlpha App Development internship (Task 4).

## Features

- **Words, phrases, and sentences:** three categories (Vocabulary, Phrases, Grammar) with 12 items each, bundled in the app.
- **Daily lesson:** a new set of 5 flashcards every day, rotating by date, with a daily streak.
- **Flashcards with translations and pronunciation:** each card shows the Spanish, a phonetic pronunciation guide, a **Listen** button (text-to-speech in Spanish via `expo-speech`), and **Show Translation**.
- **Quizzes:** multiple-choice tests per category plus a mixed practice test, with instant right/wrong feedback and a final score.
- **Progress tracking:** lessons completed, best quiz scores, and streak are saved on your device with AsyncStorage.
- **Clean interface:** simple home screen, category lists, and one focused card at a time.

## Tech stack

- React Native with Expo
- `@react-native-async-storage/async-storage` for local storage
- `expo-speech` for Spanish pronunciation audio
- Runs on Android, iOS (through Expo Go), and the web

## Getting started

```bash
git clone https://github.com/x3r01432/CodeAlpha_LanguageLearningApp.git
cd CodeAlpha_LanguageLearningApp
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone, or press `w` to open it in the browser.

## Project structure

- `App.js`: the app screens (home, categories, lessons, quizzes, progress) and storage
- `content.js`: the Spanish lesson content (words, phrases, grammar sentences)
- `app.json`: Expo configuration
- `assets/`: app icons and splash images

## Note

The Listen button uses the device's built-in voices. If no Spanish voice is installed, the sound may use a default voice or be silent.

## Author

Built by [x3r01432](https://github.com/x3r01432) during the CodeAlpha App Development internship.
