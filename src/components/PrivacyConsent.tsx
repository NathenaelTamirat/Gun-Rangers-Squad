'use client'

import { useEffect, useState } from 'react'

export function PrivacyConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = sessionStorage.getItem('recoil_duel_privacy')
    if (!accepted) setVisible(true)
  }, [])

  const accept = () => {
    sessionStorage.setItem('recoil_duel_privacy', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        maxWidth: '420px', width: '90%', padding: '28px 24px',
        backgroundColor: '#1a1a2e', borderRadius: '12px',
        border: '1px solid #444',
        color: '#ccc', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.6',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
      }}>
        <h2 style={{ color: '#fff', fontSize: '18px', margin: '0 0 12px 0' }}>Privacy Notice</h2>

        <p style={{ margin: '0 0 10px 0', color: '#aaa' }}>
          Recoil Duel runs entirely in your browser. <strong style={{ color: '#ddd' }}>No data is sent anywhere.</strong>
        </p>

        <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '13px' }}>
          The following data is stored locally on your device:
        </p>

        <ul style={{ margin: '0 0 14px 0', paddingLeft: '18px', color: '#888', fontSize: '13px' }}>
          <li><strong style={{ color: '#aaa' }}>IndexedDB</strong> — battle history (weapons, arena, winner, stats)</li>
          <li><strong style={{ color: '#aaa' }}>localStorage</strong> — prediction streak, level progress, sound preference</li>
          <li><strong style={{ color: '#aaa' }}>sessionStorage</strong> — this acceptance flag (cleared when you close the tab)</li>
        </ul>

        <p style={{ margin: '0 0 18px 0', color: '#999', fontSize: '13px' }}>
          No cookies, no analytics, no tracking, no backend.
          All data stays on your device.
        </p>

        <button
          onClick={accept}
          style={{
            width: '100%', padding: '10px', fontSize: '15px', fontWeight: 'bold',
            fontFamily: 'monospace', color: '#fff', backgroundColor: '#3366cc',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}
        >
          Accept &amp; Play
        </button>
      </div>
    </div>
  )
}
