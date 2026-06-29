import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Recoil Duel',
  description: 'Privacy policy for Recoil Duel — a frontend-only browser game',
}

export default function PrivacyPage() {
  return (
    <main style={{
      maxWidth: '720px', margin: '0 auto', padding: '40px 24px',
      color: '#ccc', fontFamily: 'monospace', fontSize: '15px', lineHeight: '1.7',
    }}>
      <h1 style={{ color: '#fff', fontSize: '26px', marginBottom: '8px' }}>Privacy Policy</h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>Last updated: June 2026</p>

      <Section title="No Backend">
        Recoil Duel is a fully client-side application. There is no server, no database, no API, and no
        external network requests. All game logic executes entirely inside your browser.
      </Section>

      <Section title="No Data Collection">
        We do not collect, store, transmit, or share any personal data. There are no analytics,
        trackers, cookies, or third-party scripts embedded in this application.
      </Section>

      <Section title="Local Storage">
        The game uses your browser&apos;s <code style={{ color: '#88bbff' }}>localStorage</code> to persist the following
        information locally on your device:
      </Section>

      <ul style={{ color: '#aaa', paddingLeft: '24px', marginTop: '-8px' }}>
        <li><strong style={{ color: '#ddd' }}>Bet Streak &amp; Total</strong> — your prediction win streak and total correct predictions</li>
        <li><strong style={{ color: '#ddd' }}>Completed Levels</strong> — which campaign levels you have cleared</li>
        <li><strong style={{ color: '#ddd' }}>Sound Preference</strong> — whether sound is muted or enabled</li>
      </ul>

      <p style={{ color: '#aaa' }}>
        This data never leaves your browser. You can clear it at any time via your
        browser&apos;s settings or by clearing localStorage for this site.
      </p>

      <Section title="No Account Required">
        You do not need to create an account, sign in, or provide any personal information
        to play the game.
      </Section>

      <Section title="Third Parties">
        This application does not integrate with any third-party services, APIs, or embeds.
        All dependencies (React, Next.js, Matter.js) run locally within the client-side bundle.
      </Section>

      <Section title="Contact">
        This is an open-source project. If you have questions, please open an issue on the
        <a href="https://github.com/NathenaelTamirat/Gun-Rangers-Squad" style={{ color: '#88bbff', marginLeft: '4px' }}>
          GitHub repository
        </a>.
      </Section>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <a href="/" style={{ color: '#88bbff', fontSize: '14px' }}>← Back to Game</a>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 style={{ color: '#fff', fontSize: '18px', marginTop: '24px', marginBottom: '6px' }}>{title}</h2>
      <p style={{ color: '#aaa', margin: '0 0 12px 0' }}>{children}</p>
    </>
  )
}
