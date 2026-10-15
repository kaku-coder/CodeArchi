
const PAGES = [
  { id: 'home', name: 'Home' },
  { id: 'explorer', name: 'Explorer' },
  { id: 'deps', name: 'Dependencies' },
  { id: 'failure', name: 'Failures' },
  { id: 'impact', name: 'Impact' },
  { id: 'insights', name: 'AI Insights' }
];

export default function Header({ activePage, onSelectPage }) {
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
    </header>
  );
}
