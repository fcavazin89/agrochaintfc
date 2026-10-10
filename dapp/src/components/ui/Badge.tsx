type BadgeVariant = 'coffee' | 'cacao' | 'certified' | 'pending' | 'rejected';

const BADGE_STYLES: Record<BadgeVariant, { background: string; color: string; label: string }> = {
  coffee:    { background: '#4a2f1c', color: '#f5f1e7', label: '☕ Coffee' },
  cacao:     { background: '#b8912a', color: '#fff', label: '🍫 Cacao' },
  certified: { background: '#1f6440', color: '#fff', label: '✅ Certificado' },
  pending:   { background: '#e5a20a', color: '#fff', label: '⏳ Pendente' },
  rejected:  { background: '#c0392b', color: '#fff', label: '❌ Rejeitado' },
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
}

export function Badge({ variant, label }: BadgeProps) {
  const style = BADGE_STYLES[variant];
  return (
    <span
      style={{display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: style.background,
        color: style.color,
        fontSize: '12px',
        fontWeight: '600',
        padding: '3px 10px',
        borderRadius: '12px',
        whiteSpace: 'nowrap',}}
    >
      {label ?? style.label}
    </span>
  );
}
