export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #f6f0e6 0%, #e8dcc8 25%, #d4c8b0 50%, #c8bca4 75%, #f0e8d8 100%)',
      }}
    >
      {/* Monet-style watercolor background blobs */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(184,160,208,0.4), transparent 60%),
            radial-gradient(ellipse 50% 60% at 80% 70%, rgba(144,180,208,0.35), transparent 60%),
            radial-gradient(ellipse 70% 40% at 50% 50%, rgba(208,184,136,0.3), transparent 50%),
            radial-gradient(ellipse 40% 50% at 70% 20%, rgba(212,152,152,0.3), transparent 50%)
          `,
          animation: 'ambientShift 8s ease-in-out infinite alternate',
        }}
      />

      {/* Floating watercolor particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[120px] h-[120px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #C4B5D8 0%, transparent 70%)',
            top: '15%',
            left: '10%',
            animation: 'ambientShift 6s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute w-[80px] h-[80px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #A0BCD4 0%, transparent 70%)',
            top: '60%',
            right: '15%',
            animation: 'ambientShift 7s ease-in-out infinite alternate-reverse',
          }}
        />
        <div
          className="absolute w-[100px] h-[100px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #D4A0A0 0%, transparent 70%)',
            bottom: '20%',
            left: '25%',
            animation: 'ambientShift 5s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Logo */}
      <div
        className="relative z-10 flex flex-col items-center"
        style={{ animation: 'popIn 0.6s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center text-[32px] font-bold text-white mb-[16px] shadow-[0_8px_32px_rgba(192,120,86,0.3)]"
          style={{
            background: 'linear-gradient(135deg, #C07856 0%, #D48A68 50%, #B86848 100%)',
          }}
        >
          M
        </div>
        <div className="text-[22px] font-bold text-[var(--text)] mb-[4px] tracking-wide">
          MindNotes
        </div>
        <div className="text-[12px] text-[var(--text-3)] mb-[24px] tracking-wider">Pro</div>

        {/* Loading dots */}
        <div className="flex gap-[6px]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: 'var(--primary)',
                animation: `loadingDot 1.2s ${i * 0.15}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom branding */}
      <div
        className="absolute bottom-[20px] text-[11px] text-[var(--text-4)] tracking-wide"
        style={{ animation: 'fadeIn 0.8s ease 0.3s both' }}
      >
        Local-first whiteboard
      </div>
    </div>
  )
}
