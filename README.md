# StreakFlow Habit Tracker

StreakFlow is a habit tracking web application that helps users build consistency by tracking habits, streaks, and frequencies over time. This is a frontend-only application built using React and TypeScript, with Firebase used for authentication and data storage.

## Features
- Google Sign-In authentication  
- Create and manage habits  
- Daily, weekly, and custom habit frequency support  
- Habit streak tracking  
- User-specific data storage  
- Responsive user interface  

## Tech Stack
- Frontend: React, TypeScript, Vite  
- Authentication: Firebase Authentication  
- Database: Firebase Firestore  
- Hosting: Vercel  

## Project Structure
streakflow-habit-tracker/  
components/        Reusable UI components  
utils/             Utility/helper functions  
firebase.ts        Firebase configuration  
App.tsx            Root application component  
index.tsx          Entry point  
vite-env.d.ts      Vite environment typings  
package.json  
README.md  

## Environment Variables
Create a `.env.local` file in the project root and add the following variables. All variables must start with `VITE_` and should not be committed to GitHub.

VITE_FIREBASE_API_KEY=your_api_key  
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com  
VITE_FIREBASE_PROJECT_ID=your_project_id  
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com  
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id  
VITE_FIREBASE_APP_ID=your_app_id  

## Local Development
Clone the repository, install dependencies, and start the development server.

git clone https://github.com/Boopathi7706/streakflow-habit-tracker.git  
cd streakflow-habit-tracker  
npm install  
npm run dev  

The application will be available at http://localhost:5173

## Production Build
To generate a production build, run:

npm run build  

The optimized output will be created in the `dist` directory.

## Deployment
The application is deployed using Vercel. Any push to the main branch triggers an automatic deployment.

Deployment flow:  
Local changes → git commit → git push → Vercel auto-deploy  

Ensure all required environment variables are configured in the Vercel dashboard.

## Security
Firebase Web API keys are public by design. Application security is enforced using Firebase Authentication and Firestore Security Rules. Each user can access only their own data.

## Author
Boopathi V  
Computer Science Engineering Student  
GitHub: https://github.com/Boopathi7706  

## License
This project is created for learning and portfolio purposes.
