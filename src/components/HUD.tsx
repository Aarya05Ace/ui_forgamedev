/**
 * HUD.tsx — scoreboard, the collapse countdown, carrying indicator, and the
 * end-of-round winner banner. Pure DOM overlay rendered above the canvas.
 */
import { useEffect, useState } from 'react';
import type { PlayerData, Game } from '../generated/types';

interface HUDProps {
  players: ReadonlyMap<string, PlayerData>;
  game: Game | null;
  localIdentityHex: string | null;
  onRestart: () => void;
}

function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function HUD({ players, game, localIdentityHex, onRestart }: HUDProps) {
  // Smoothly tick the displayed clock between server updates.
  const [, force] = useState(0);
  useEffect(() => {
    const h = setInterval(() => force(n => n + 1), 500);
    return () => clearInterval(h);
  }, []);

  const roster = Array.from(players.values()).sort((a, b) => b.score - a.score);
  const phase = game?.phase ?? 'lobby';
  const remaining = game ? Number(game.endsTick - game.nowTick) : 0;
  const lowTime = phase === 'playing' && remaining <= 30;

  const me = localIdentityHex ? players.get(localIdentityHex) : undefined;
  const carrying = !!me && me.carryingRelicId !== undefined && me.carryingRelicId !== null;

  let winnerName = '';
  if (phase === 'ended') {
    const w = roster[0];
    winnerName = w ? w.username : '—';
  }

  const panel: React.CSSProperties = {
    position: 'absolute',
    fontFamily: "'Cinzel', Georgia, serif",
    color: '#f3e3c0',
    zIndex: 20,
    pointerEvents: 'none',
    textShadow: '0 2px 8px rgba(0,0,0,0.9)',
  };

  return (
    <>
      {/* Countdown — top center */}
      <div style={{ ...panel, top: 16, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 4, opacity: 0.7 }}>THE COLLAPSE</div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1,
            color: lowTime ? '#ff5a5a' : '#ffd76a',
            textShadow: lowTime
              ? '0 0 24px rgba(255,60,60,0.9)'
              : '0 0 18px rgba(255,190,80,0.7)',
            animation: lowTime ? 'pulse 1s ease-in-out infinite' : undefined,
          }}
        >
          {phase === 'playing' ? fmtTime(remaining) : phase === 'ended' ? '0:00' : '—:—'}
        </div>
      </div>

      {/* Scoreboard — top right */}
      <div
        style={{
          ...panel,
          top: 16,
          right: 16,
          minWidth: 190,
          background: 'rgba(10,6,4,0.55)',
          border: '1px solid rgba(255,200,90,0.25)',
          borderRadius: 10,
          padding: '10px 14px',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 3, opacity: 0.7, marginBottom: 6 }}>RELICS BANKED</div>
        {roster.length === 0 && <div style={{ opacity: 0.5, fontSize: 14 }}>waiting for robbers…</div>}
        {roster.map((p, i) => {
          const isMe = p.identity.toHexString() === localIdentityHex;
          return (
            <div
              key={p.identity.toHexString()}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '3px 0',
                fontWeight: isMe ? 700 : 400,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: cssColor(p.color),
                    boxShadow: `0 0 8px ${cssColor(p.color)}`,
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: isMe ? '#fff3cf' : '#e9d9b6' }}>
                  {i === 0 && p.score > 0 ? '👑 ' : ''}
                  {p.username}
                  {isMe ? ' (you)' : ''}
                </span>
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#ffd76a' }}>{p.score}</span>
            </div>
          );
        })}
      </div>

      {/* Carrying indicator — bottom center */}
      {phase === 'playing' && carrying && (
        <div
          style={{
            ...panel,
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: '#ffe89a',
          }}
        >
          <div style={{ fontSize: 18, animation: 'pulse 1.2s ease-in-out infinite' }}>
            ✦ carrying a relic — get to your gate! ✦
          </div>
        </div>
      )}

      {/* Controls hint — bottom left */}
      <div style={{ ...panel, bottom: 14, left: 16, fontSize: 12, opacity: 0.6, fontFamily: 'monospace' }}>
        WASD move · Shift sprint · <b>F</b> shove · grab/bank are automatic
      </div>

      {/* Winner banner */}
      {phase === 'ended' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(ellipse at center, rgba(20,8,4,0.55), rgba(0,0,0,0.85))',
            fontFamily: "'Cinzel', Georgia, serif",
            color: '#ffd76a',
          }}
        >
          <div style={{ fontSize: 20, letterSpacing: 6, opacity: 0.8 }}>THE TOMB IS SEALED</div>
          <div style={{ fontSize: 64, fontWeight: 700, textShadow: '0 0 40px rgba(255,190,80,0.8)' }}>
            👑 {winnerName}
          </div>
          <div style={{ fontSize: 20, opacity: 0.85 }}>escapes with the most relics</div>
          <button
            onClick={onRestart}
            style={{
              marginTop: 28,
              pointerEvents: 'auto',
              cursor: 'pointer',
              padding: '12px 30px',
              fontSize: 18,
              fontFamily: "'Cinzel', Georgia, serif",
              color: '#1a0f08',
              background: 'linear-gradient(#ffd76a,#e0a93f)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 0 24px rgba(255,190,80,0.6)',
            }}
          >
            ⟳ Raid Again
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </>
  );
}

function cssColor(name: string): string {
  const map: Record<string, string> = {
    cyan: '#37e6e6',
    magenta: '#ff5de2',
    yellow: '#ffe14d',
    lightgreen: '#7bff7b',
    orange: '#ff9b3d',
    white: '#f5f5f5',
  };
  return map[name] ?? name;
}
