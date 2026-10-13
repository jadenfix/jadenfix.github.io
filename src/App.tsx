import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BlogPage from './pages/BlogPage';
import ScrollToTop from './components/ScrollToTop';
import CustomCursor from './components/CustomCursor';
import Starfield from './components/Starfield';
import TechStackPage from './pages/TechStackPage';
import OutsidePage from './pages/OutsidePage';

function App() {
  const location = useLocation();

  return (
    <div className="bg-bg-primary min-h-screen text-text-primary">
      <ScrollToTop />
      <CustomCursor />
      <Starfield density={300} />
      <div className="flex flex-col min-h-screen relative z-10">
        <Header />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tech-stack" element={<TechStackPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/outside" element={<OutsidePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AnimatePresence>
        <Footer />
      </div>
    </div>
  );
}

export default App;
