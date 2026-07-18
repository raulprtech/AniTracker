# Anime Discovery App

A modern, responsive web application for discovering and tracking anime. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Discover Anime**: Browse the current season's anime, top-rated anime, and search by genre or title using the [Jikan API](https://jikan.moe/) (an unofficial MyAnimeList API).
- **Infinite Scrolling**: Seamlessly load more anime as you scroll through the Discover page.
- **User Authentication**: Secure sign-in with Google using Firebase Authentication.
- **Personalized Lists**: Authenticated users can save anime to their personal list and track their watching progress (powered by Firebase Firestore).
- **Responsive Design**: A clean, dark-mode focused UI that looks great on desktop and mobile devices.

## Tech Stack

- **Frontend Framework**: React with TypeScript, bundled by Vite.
- **Styling**: Tailwind CSS for utility-first styling and a modern, cohesive look.
- **Backend & Database**: Firebase Authentication for user management and Firestore for storing personal anime lists.
- **Icons**: Lucide React for consistent and crisp iconography.
- **API**: Integrates with the Jikan REST API for fetching up-to-date anime data.

## Getting Started

1. **Install Dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Set Up Firebase**:
   - Create a Firebase project and enable Authentication (Google Provider) and Firestore.
   - Update the Firebase configuration in your environment or configuration files.

3. **Start the Development Server**:
   \`\`\`bash
   npm run dev
   \`\`\`

## Architecture Notes

- The app uses client-side rendering with React.
- Fallback data is implemented to ensure the application remains functional even if the external Jikan API is rate-limited or temporarily unavailable.
- Firebase is used to seamlessly sync user lists across devices.
