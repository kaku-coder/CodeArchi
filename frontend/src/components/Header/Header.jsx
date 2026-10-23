import { useAuth } from '../../context/authContext';

const PAGES = [
  { id: 'home', name: 'Home' },
  { id: 'explorer', name: 'Explorer' },
  { id: 'deps', name: 'Dependencies' },
  { id: 'failure', name: 'Failures' },
  { id: 'impact', name: 'Impact' },
  { id: 'insights', name: 'AI Insights' }
];

function initialsOf(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function Header({ activePage, onSelectPage }) {
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    onSelectPage('home');
  };

  return (
    <header>
      <div
        className="brand"
        onClick={() => onSelectPage('home')}
        title="Go to Home"
      >
        <span className="led"></span>
        <span>CodeArchi</span>
        <span className="brand-badge">REACT</span>
      </div>

      <nav aria-label="Main Navigation">
        {PAGES.map((page) => {
          const isActive = activePage === page.id;
          return (
            <button
              key={page.id}
              type="button"
              className={`key ${isActive ? 'hot' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectPage(page.id)}
            >
              {page.name}
            </button>
          );
        })}
      </nav>

      <div className="header-auth">
        {user ? (
          <>
            <button
              type="button"
              className={`header-user ${activePage === 'auth' ? 'is-active' : ''}`}
              onClick={() => onSelectPage('auth')}
              title="Open your account"
            >
              <span className="header-avatar">{initialsOf(user.name)}</span>
              <span className="header-user-name">{user.name}</span>
            </button>
            <button type="button" className="key header-signout" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`key ${activePage === 'auth' ? 'hot' : ''}`}
            onClick={() => onSelectPage('auth')}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
