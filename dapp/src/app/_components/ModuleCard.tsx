'use client';

export function ModuleCard({
  tag,
  title,
  desc,
}: {
  tag: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--raio-sm)',
        border: '1px solid var(--linha)',
        background: 'var(--sup-2)',
        cursor: 'pointer',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'all var(--t-rapida)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--sup-3)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--linha-forte)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--sup-2)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--linha)';
      }}
    >
      <div
        style={{
          fontSize: '10.5px',
          fontWeight: 600,
          letterSpacing: '.5px',
          textTransform: 'uppercase',
          color: 'var(--verde-600)',
          marginBottom: '6px',
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontFamily: 'var(--serifa)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--texto-1)',
          marginBottom: '6px',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--texto-3)', lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  );
}
