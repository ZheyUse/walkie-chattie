const STAR_DEEP = Array.from({ length: 45 }, (_, i) => {
  const s = i * 137.508
  return {
    x: parseFloat(seededRand(s, 0, 100).toFixed(1)),
    y: parseFloat(seededRand(s + 1, 0, 100).toFixed(1)),
    s: parseFloat(seededRand(s + 2, 0.8, 1.5).toFixed(1)),
    d: parseFloat(seededRand(s + 3, 2, 5).toFixed(1)),
    dl: parseFloat(seededRand(s + 4, 0, 4).toFixed(1)),
    o: parseFloat(seededRand(s + 5, 10, 40) / 100).toFixed(2),
  }
})

const STAR_MID = Array.from({ length: 18 }, (_, i) => {
  const s = i * 198.471
  return {
    x: parseFloat(seededRand(s, 0, 100).toFixed(1)),
    y: parseFloat(seededRand(s + 1, 0, 100).toFixed(1)),
    s: parseFloat(seededRand(s + 2, 1.5, 2.5).toFixed(1)),
    d: parseFloat(seededRand(s + 3, 4, 8).toFixed(1)),
    dl: parseFloat(seededRand(s + 4, 0, 5).toFixed(1)),
    o: parseFloat(seededRand(s + 5, 30, 50) / 100).toFixed(2),
  }
})

const BRIGHT_STARS: [string, string][] = [
  ['12%', '18%'],
  ['78%', '8%'],
  ['88%', '60%'],
  ['25%', '75%'],
  ['60%', '30%'],
  ['5%', '55%'],
]

function seededRand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000
  return min + (x - Math.floor(x)) * (max - min)
}

function ShootingStar({ delay, top, left, dur }: { delay: number; top: string; left: string; dur: number }) {
  return (
    <div
      className="absolute"
      style={{
        top,
        left,
        width: 100,
        height: 1,
        animation: `shoot ${dur}s ease-in ${delay}s infinite`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(to right, transparent 0%, rgba(180,220,255,0.9) 40%, rgba(255,255,255,1) 100%)',
          borderRadius: '50%',
          boxShadow: '0 0 6px 2px rgba(168,210,255,0.6)',
        }}
      />
    </div>
  )
}

export default function SpaceBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Orbital rings */}
      <div
        className="absolute rounded-full"
        style={{
          width: 640,
          height: 640,
          top: '50%',
          left: '50%',
          marginTop: -320,
          marginLeft: -320,
          background:
            'radial-gradient(circle, transparent 45%, rgba(139,92,246,0.04) 55%, transparent 65%)',
          animation: 'orbit-glow 24s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 900,
          top: '50%',
          left: '50%',
          marginTop: -450,
          marginLeft: -450,
          background:
            'radial-gradient(circle, transparent 48%, rgba(26,159,255,0.025) 52%, transparent 60%)',
          animation: 'orbit-glow 36s ease-in-out infinite reverse',
        }}
      />

      {/* Nebula wisps — purple */}
      <div
        className="absolute rounded-full"
        style={{
          width: 480,
          height: 320,
          top: '5%',
          left: '-5%',
          background:
            'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)',
          filter: 'blur(24px)',
          animation: 'drift-a 22s ease-in-out infinite',
        }}
      />
      {/* Nebula wisps — deep blue */}
      <div
        className="absolute rounded-full"
        style={{
          width: 560,
          height: 380,
          bottom: '0%',
          right: '-8%',
          background:
            'radial-gradient(ellipse, rgba(26,159,255,0.07) 0%, rgba(26,159,255,0.02) 45%, transparent 65%)',
          filter: 'blur(28px)',
          animation: 'drift-b 30s ease-in-out infinite',
        }}
      />
      {/* Center nebula tint */}
      <div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 500,
          top: '50%',
          left: '50%',
          marginTop: -250,
          marginLeft: -350,
          background:
            'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, rgba(75,0,130,0.02) 40%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'drift-a 18s ease-in-out infinite',
        }}
      />

      {/* Star layer 1: small fast-twinkle */}
      {STAR_DEEP.map((s, i) => (
        <div
          key={`s1-${i}`}
          className="absolute rounded-full"
          style={{
            width: s.s + 'px',
            height: s.s + 'px',
            left: s.x + '%',
            top: s.y + '%',
            background: `rgba(220,230,255,${s.o})`,
            animation: `twinkle-fast ${s.d}s ease-in-out ${s.dl}s infinite`,
          }}
        />
      ))}

      {/* Star layer 2: medium slow-twinkle */}
      {STAR_MID.map((s, i) => (
        <div
          key={`s2-${i}`}
          className="absolute rounded-full"
          style={{
            width: s.s + 'px',
            height: s.s + 'px',
            left: s.x + '%',
            top: s.y + '%',
            background: `rgba(220,235,255,${s.o})`,
            boxShadow: `0 0 ${s.s}px 0 rgba(180,210,255,0.15)`,
            animation: `twinkle-slow ${s.d}s ease-in-out ${s.dl}s infinite`,
          }}
        />
      ))}

      {/* Star layer 3: bright accent glow stars */}
      {BRIGHT_STARS.map((pos, i) => (
        <div
          key={`s3-${i}`}
          className="absolute rounded-full"
          style={{
            width: '2px',
            height: '2px',
            left: pos[0],
            top: pos[1],
            background: '#c8d8ff',
            boxShadow:
              '0 0 6px 2px rgba(168,208,255,0.5), 0 0 14px 4px rgba(139,92,246,0.2)',
            animation: `twinkle-slow ${3 + i * 0.8}s ease-in-out ${i}s infinite`,
          }}
        />
      ))}

      {/* Shooting stars */}
      <ShootingStar delay={0} top="8%" left="75%" dur={1.4} />
      <ShootingStar delay={6} top="15%" left="90%" dur={1.8} />
      <ShootingStar delay={12} top="5%" left="60%" dur={1.2} />
      <ShootingStar delay={22} top="20%" left="82%" dur={1.6} />
      <ShootingStar delay={35} top="3%" left="70%" dur={1.5} />

      {/* Cosmic dust clouds */}
      <div
        style={{
          position: 'absolute',
          width: 120,
          height: 80,
          top: '30%',
          left: '5%',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(12px)',
          animation: 'dust-drift 14s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 160,
          height: 100,
          top: '55%',
          right: '8%',
          background: 'radial-gradient(ellipse, rgba(26,159,255,0.1) 0%, transparent 70%)',
          filter: 'blur(14px)',
          animation: 'dust-drift 18s ease-in-out infinite reverse',
        }}
      />

      {/* Faint planet with ring */}
      <div
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          top: '10%',
          right: '12%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, rgba(139,92,246,0.15), rgba(80,30,180,0.08) 60%, transparent 80%)',
          boxShadow: '0 0 30px 8px rgba(139,92,246,0.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 140,
          height: 36,
          top: 'calc(10% + 45px - 18px)',
          right: 'calc(12% + 45px - 70px)',
          borderRadius: '50%',
          border: '1px solid rgba(168,130,255,0.18)',
          animation: 'ring-shimmer 6s ease-in-out infinite',
        }}
      />
    </div>
  )
}