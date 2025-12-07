# 🌉 Jaden Fix - Personal Website

**Live at: [https://jadenfix.github.io](https://jadenfix.github.io)**

A modern, interactive personal portfolio showcasing AI/ML work, projects, and the SF Bay Area lifestyle. Built with cutting-edge web technologies featuring smooth animations, custom cursor interactions, and a dark theme inspired by GitHub's design system.

## ✨ What This Website Shows

- **🏠 Home**: Epic hero section with Golden Gate Bridge silhouette, starfield background, and Bay Area tech messaging
- **👨‍💻 About**: Personal story, background, and interests
- **🚀 Projects**: Curated showcase of AI/ML projects, agent orchestration tools, and research work
- **🛠️ Tech Stack**: Comprehensive overview of technologies and tools used
- **🏔️ Outside**: Adventures, photography, and life beyond code
- **📝 Blog**: Technical writing and insights
- **📞 Contact**: Get in touch and collaboration opportunities

## 🛠️ How to Make This Yourself

### Quick Setup (5 minutes)

```bash
# Clone this repo as a template
git clone https://github.com/jadenfix/jadenfix.github.io.git my-website
cd my-website

# Install dependencies
npm install

# Start development server
npm run dev
```

### Tech Stack & Architecture

**Core Technologies:**
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom theme
- **Animations**: Framer Motion + React Spring
- **Icons**: Lucide React + React Icons
- **Routing**: React Router DOM
- **Build**: Vite (lightning fast)
- **Deployment**: GitHub Pages

**Key Dependencies:**
```json
{
  "react": "^19.2.0",
  "framer-motion": "^12.23.24",
  "tailwindcss": "^3.4.18",
  "@studio-freight/lenis": "^1.0.42",
  "vanilla-tilt": "^1.8.1"
}
```

### Step-by-Step Build Guide

#### 1. Project Initialization

```bash
# Create Vite React project with TypeScript
npm create vite@latest my-website -- --template react-ts
cd my-website

# Install core dependencies
npm install framer-motion react-router-dom lucide-react react-icons @studio-freight/lenis vanilla-tilt
npm install -D tailwindcss postcss autoprefixer @types/node
```

#### 2. Tailwind CSS Setup

```bash
npx tailwindcss init -p
```

**tailwind.config.js** - Custom Bay Area theme:
```javascript
export default {
  theme: {
    extend: {
      colors: {
        // SF Bay Area Theme
        'golden-gate': '#C0362C',
        'fog-light': '#cfd8dc',
        'sf-blue': '#1a365d',
        // Dark Theme Base
        'bg-primary': '#0d1117',
        'text-primary': '#f0f6fc',
        'accent-primary': '#63b3ed',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
      },
      // Sharp corners (no border radius)
      borderRadius: {
        'none': '0', 'sm': '0', 'md': '0', 'lg': '0', 'xl': '0',
        'full': '9999px', // Keep for circles
      },
      // Custom animations
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
}
```

#### 3. Component Architecture

**Key Components:**
- `CustomCursor` - Interactive cursor that follows mouse
- `Starfield` - Animated background stars
- `ScrambleText` - Text animation effects
- `SmoothScroll` - Lenis-based smooth scrolling
- `ProjectCard` - Interactive project showcase cards

**Example CustomCursor:**
```tsx
import { useEffect, useRef } from 'react';

export const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed w-4 h-4 bg-accent-primary rounded-full pointer-events-none z-50 mix-blend-difference"
    />
  );
};
```

#### 4. Page Structure

**App.tsx** - Main routing:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CustomCursor, SmoothScroll, Header, Footer } from './components';

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <SmoothScroll />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        {/* ... other routes */}
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
```

#### 5. Animations & Interactions

**Framer Motion Examples:**
```tsx
// Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

// Hover effects on project cards
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="project-card"
>
  {/* Card content */}
</motion.div>
```

#### 6. Deployment to GitHub Pages

```bash
# Build for production
npm run build

# Deploy (using gh-pages or manual)
npm install -D gh-pages
npm run deploy
```

**vite.config.ts** for GitHub Pages:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',
  build: {
    outDir: 'dist'
  }
});
```

### Design Philosophy

**Bay Area Tech Aesthetic:**
- Sharp, modern edges (no border radius except circles)
- Dark theme with GitHub-inspired colors
- Golden Gate Bridge as visual motif
- Clean typography with Inter font
- Subtle animations that enhance UX

**Performance Focus:**
- Vite for fast builds
- Lazy loading for components
- Optimized images
- Minimal bundle size

### Customization Tips

1. **Colors**: Update `tailwind.config.js` with your brand colors
2. **Content**: Replace projects in `src/data/projects.ts`
3. **Images**: Add your photos to `public/images/`
4. **Animations**: Adjust timing in Framer Motion components
5. **Icons**: Use Lucide React for consistent iconography

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

---

**Built by [Jaden Fix](https://github.com/jadenfix)**

Check out the live site: **[jadenfix.github.io](https://jadenfix.github.io)**
