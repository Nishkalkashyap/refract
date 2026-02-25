export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="hero-card">
        <p className="eyebrow">Refract Next.js Example</p>
        <h1>Visual Design Mode</h1>
        <p>
          Toggle select mode from the floating button and click any element to open the
          Tailwind Editor panel.
        </p>
      </header>

      <section className="content-grid">
        <article className="info-card">
          <h2>Editable Content Block</h2>
          <p className="preview-text">
            Use this card to test class updates. Static className values are persisted to
            source files via the Refract server bridge.
          </p>
          <button className="primary-btn" type="button">
            Demo Button
          </button>
        </article>

        <article className="info-card">
          <h2>Nested Elements</h2>
          <ul>
            <li>
              <strong>Strong text target</strong>
            </li>
            <li>
              <span>Nested span target for selection checks.</span>
            </li>
            <li>
              <a href="https://nextjs.org/docs" rel="noreferrer" target="_blank">
                Visit Next.js Docs
              </a>
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
