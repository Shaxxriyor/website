import { useEffect, useState } from 'react';

// Hash routes (#/students/12) need no server rewrites on any host.
function parse() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'home', id: parts[1] ? Number(parts[1]) : null };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      document.querySelector('.main')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const navigate = (path) => {
  window.location.hash = path;
};
