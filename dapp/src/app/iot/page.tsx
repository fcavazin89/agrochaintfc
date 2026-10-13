'use client';
import { useState, useEffect } from 'react';

const sensors = [
  { id: '1', name: 'Temperatura', unit: '°C', value: 24.5, range: [18, 30], location: 'Bloco 1' },
  { id: '2', name: 'Umidade', unit: '%', value: 72, range: [40, 85], location: 'Bloco 1' },
  { id: '3', name: 'pH do Solo', unit: 'pH', value: 6.2, range: [5.5, 7.0], location: 'Bloco 2' },
  { id: '4', name: 'Precipitação', unit: 'mm', value: 2.1, range: [0, 50], location: 'Topo da Fazenda' },
];

const alerts = [
  { id: '1', timestamp: '2024-10-09 14:32', sensor: 'Umidade', message: 'Umidade acima do ideal em Bloco 3', severity: 'warning' },
  { id: '2', timestamp: '2024-10-09 13:15', sensor: 'Temperatura', message: 'Temperatura estável', severity: 'info' },
  { id: '3', timestamp: '2024-10-09 11:45', sensor: 'pH', message: 'pH ligeiramente ácido, monitorar', severity: 'warning' },
];

export default function IoTPage() {
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString('pt-BR'));

  const refresh = () => {
    setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
  };

  const getSensorStatus = (value: number, range: number[]) => {
    if (value < range[0] - 10 || value > range[1] + 10) return 'critical';
    if (value < range[0] || value > range[1]) return 'warning';
    return 'optimal';
  };

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <div>
          <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
            📡 IoT Monitoramento
          </h1>
          <p style={{margin: 0, color: '#495649', fontSize: '14px'}}>
            Sensores em tempo real — Última atualização: {lastUpdate}
          </p>
        </div>
        <button
          onClick={refresh}
          style={{
            background: '#1f6440',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Sensor Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px'}}>
        {sensors.map(sensor => {
          const status = getSensorStatus(sensor.value, sensor.range);
          const statusStyle = {
            optimal: { bg: '#f0faf4', border: '#1f6440', text: '#1f6440', icon: '✅' },
            warning: { bg: '#fff8e1', border: '#b8912a', text: '#b8912a', icon: '⚠️' },
            critical: { bg: '#f8d7da', border: '#a83226', text: '#a83226', icon: '❌' },
          };
          const style = statusStyle[status as keyof typeof statusStyle];
          return (
            <div key={sensor.id} style={{background: '#fff', border: `2px solid ${style.border}`, borderRadius: '12px', padding: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px'}}>
                <div>
                  <p style={{margin: 0, fontSize: '13px', color: '#495649', fontWeight: '600'}}>{sensor.name}</p>
                  <p style={{margin: '4px 0 0', fontSize: '12px', color: '#888'}}>{sensor.location}</p>
                </div>
                <span style={{fontSize: '20px'}}>{style.icon}</span>
              </div>
              <p style={{margin: 0, fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '700', color: style.text}}>
                {sensor.value}{sensor.unit}
              </p>
              <p style={{margin: '8px 0 0', fontSize: '12px', color: '#888'}}>
                Ideal: {sensor.range[0]}{sensor.unit} — {sensor.range[1]}{sensor.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Map placeholder */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '24px', marginBottom: '24px'}}>
        <h3 style={{margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
          🗺️ Mapa de Sensores
        </h3>
        <div
          style={{
            background: '#f9f7f2',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#888',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{fontSize: '48px', marginBottom: '16px'}}>🗺️</div>
          <p style={{margin: 0, fontSize: '16px'}}>Visualização geográfica dos sensores</p>
          <p style={{margin: '8px 0 0', fontSize: '13px', color: '#888'}}>
            Coordenadas: -20.3155, -43.1965 (Minas Gerais, Brasil)
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h3 style={{margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
          🔔 Histórico de Alertas
        </h3>
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
            <thead>
              <tr style={{background: '#f5f1e7'}}>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Timestamp</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Sensor</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Mensagem</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Severidade</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, i) => {
                const severityStyle = {
                  info: { bg: '#e3f2fd', text: '#1f6f9e', label: 'ℹ️ Info' },
                  warning: { bg: '#fff8e1', text: '#b26a06', label: '⚠️ Aviso' },
                  critical: { bg: '#f8d7da', text: '#a83226', label: '❌ Crítico' },
                };
                const style = severityStyle[alert.severity as keyof typeof severityStyle];
                return (
                  <tr key={alert.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                    <td style={{padding: '12px 16px', color: '#495649', fontFamily: 'monospace', fontSize: '12px'}}>{alert.timestamp}</td>
                    <td style={{padding: '12px 16px', color: '#1e2a22', fontWeight: '600'}}>{alert.sensor}</td>
                    <td style={{padding: '12px 16px', color: '#495649'}}>{alert.message}</td>
                    <td style={{padding: '12px 16px'}}>
                      <span style={{background: style.bg, color: style.text, padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600'}}>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop: '24px', background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '16px'}}>
        <h4 style={{margin: '0 0 8px', color: '#1f6440'}}>📊 Dados Transmitidos via Blockchain</h4>
        <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
          Todos os dados de sensores são registrados periodicamente na blockchain para criar uma auditoria imutável do cultivo.
        </p>
      </div>
    </div>
  );
}
