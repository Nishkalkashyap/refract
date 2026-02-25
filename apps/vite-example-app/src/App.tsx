import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="page-shell">
      <header className="hero-card">
        <p className="eyebrow">Refract POC</p>
        <h1>Visual Design Mode</h1>
        <p>
          Use the floating button in the bottom-right corner to toggle selection mode and
          click any highlighted element.
        </p>
      </header>

      <section className="content-grid">
        <article className="info-card">
          <h2>Counter</h2>
          <p>Clicking this button should still work with HMR in development.</p>
          <button className="primary-btn" type="button" onClick={() => setCount((value) => value + 1)}>
            Count is {count}
          </button>
        </article>

        <article className="info-card">
          <h2>Nested Content</h2>
          <ul>
            <li>
              <strong>Section title</strong>
            </li>
            <li>
              <span>Nested span element for selection checks.</span>
            </li>
            <li>
              <a href="https://vite.dev" target="_blank" rel="noreferrer">
                Visit Vite Docs
              </a>
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
