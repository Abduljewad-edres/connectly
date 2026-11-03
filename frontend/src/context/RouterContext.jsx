import React, { createContext, useContext, useState, useEffect } from 'react';

const RouterContext = createContext();

export const RouterProvider = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (toPath) => {
    if (window.location.pathname !== toPath) {
      window.history.pushState({}, '', toPath);
      setCurrentPath(toPath);
      window.scrollTo(0, 0);
    }
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

