import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ResumeOptimizer from './components/ResumeOptimizer';
import PromptMaker from './components/PromptMaker/PromptMaker';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Resume Optimizer', icon: '📄' },
    { path: '/prompt-maker', label: 'Prompt Maker', icon: '⚙️' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">CareerMate</h1>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<ResumeOptimizer />} />
            <Route path="/prompt-maker" element={<PromptMaker />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
