# Notevo
 
I've been looking for a Note Taking app that's simpler than Notion but more organized than Google Keep. Something clean, structured, with a rich text editor. That's what Notevo's trying to be: a minimal, structured, Note Taking app
 
 ![Note Page](showCase_imgs/HomePage.png)
 
 ## To Do :
 
 - [x] fix the routing
 - [ ] add the toaster notification
 - [x] fix the middleware 404 on redirect
 - [x] add the shareable Link
 - [ ] real time collaboration
 - [x] note export pdf and markdown -> i endup Adding multi-format note export (JSON, Markdown, DOCX, PDF)
 - [x] optimistic update layer
 - [x] caching
 - [ ] speech to text and text to speech
 - [ ] i might add AI 🤞🙂
 - [x] fix the code Highlight in the editer
 - [X] add the feedback menu item in the user dropdown menu in the sidebar
 - [x] Redesigning for the home 
 - [x] fix the caching
 - [x] change the rename stff in the workingspace route
 
 
 
 ## Features
 
 - 📝 **Notion style editor** powered by TipTap
 - 🤖 **AI-powered autocompletion** with OpenAI integration
 - 🔄 **Real-time updates**
 - 📂 **Cloud storage support with Convex**
 - 🔐 **Authentication with Convex**
 - 🚀 **Optimized performance** with Convex
 - 🌍 **Deployed on Vercel** for seamless access
 
 ## Tech Stack
 
 - **Frontend:** Next.js, React, TypeScript, Tailwind CSS
 - **Backend:** Convex
 - **AI Integration:** OpenAI API, Vercel AI SDK
 - **Editor:** Tiptap (Novel)
 - **Deployment:** Vercel
 
 ## Getting Started
 
 ### Prerequisites
 Make sure you have the following installed:
 - Node.js 18+
 - Convex CLI (for backend development)
 - Vercel CLI (optional, for deployment)
 
 ### Installation
 ```bash
 git clone https://github.com/imohammedh/Notevo.git
 cd Notevo
 pnpm install  # or npm install
 ```
 
 ### Environment Variables
 Create a `.env` file and add the following:
 ```env
CONVEX_DEPLOYMENT=??

NEXT_PUBLIC_CONVEX_URL=??

CONVEX_SITE_URL=https:??

SETUP_SCRIPT_RAN=??

AUTH_GITHUB_ID=??

AUTH_GITHUB_SECRET=??

AUTH_RESEND_KEY=??

AUTH_GOOGLE_ID=??
AUTH_GOOGLE_SECRET=??
AUTH_EMAIL=??
SITE_URL="https://notevo.me/"

 ```
 
### Running Locally
```bash
pnpm dev  # or npm run dev
```
Then, open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing
Unit tests use Vitest:

```bash
npm run test:run        # run once (CI-friendly)
npm run test            # watch mode
npm run test:coverage   # coverage report
```
 
 
