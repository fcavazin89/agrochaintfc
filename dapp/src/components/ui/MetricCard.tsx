import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}

export function MetricCard({ title, value, subtitle, icon, color = '#1f6440' }: MetricCardProps) {
  return (
    <div
      style={{background: '#fff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #ddd8cc',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',}}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontSize: '28px'}}>{icon}</span>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{width: '12px', height: '12px', borderRadius: '50%', background: color}} />
        </div>
      </div>
      <div>
        <p style={{margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e2a22', fontFamily: 'Georgia, serif'}}>
          {value}
        </p>
        <p style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#495649'}}>{title}</p>
        {subtitle && <p style={{margin: 0, fontSize: '12px', color: '#888'}}>{subtitle}</p>}
      </div>
    </div>
  );
}
