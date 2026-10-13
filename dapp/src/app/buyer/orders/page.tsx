'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { PurchaseOrder } from '@/types/agrochain';
import { DeliveryStatus } from '@/types/agrochain';

const MOCK_PURCHASES: PurchaseOrder[] = [
  {
    orderId: 'ORDER-001',
    listingId: '1',
    loteId: 'LOTE-001',
    produtor: '0x1234567890123456789012345678901234567890',
    dataCompra: Date.now() - 604800000,
    dataEntrega: Date.now() + 259200000,
    status: DeliveryStatus.Transportando,
    quantidadeKg: 100,
    precoUnitario: 3.5,
    precoTotal: 350,
    origem: 'Minas Gerais',
  },
  {
    orderId: 'ORDER-002',
    listingId: '2',
    loteId: 'LOTE-002',
    produtor: '0x2234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1209600000,
    dataEntrega: Date.now() - 86400000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 250,
    precoUnitario: 5.2,
    precoTotal: 1300,
    origem: 'Bahia',
  },
  {
    orderId: 'ORDER-003',
    listingId: '3',
    loteId: 'LOTE-003',
    produtor: '0x3234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1814400000,
    dataEntrega: Date.now() - 172800000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 150,
    precoUnitario: 4.1,
    precoTotal: 615,
    origem: 'São Paulo',
  },
  {
    orderId: 'ORDER-004',
    listingId: '4',
    loteId: 'LOTE-004',
    produtor: '0x4234567890123456789012345678901234567890',
    dataCompra: Date.now() - 259200000,
    dataEntrega: Date.now() + 86400000,
    status: DeliveryStatus.Emitido,
    quantidadeKg: 80,
    precoUnitario: 6.8,
    precoTotal: 544,
    origem: 'Rondônia',
  },
  {
    orderId: 'ORDER-005',
    listingId: '5',
    loteId: 'LOTE-005',
    produtor: '0x5234567890123456789012345678901234567890',
    dataCompra: Date.now() - 86400000,
    dataEntrega: Date.now() + 172800000,
    status: DeliveryStatus.Aguardando,
    quantidadeKg: 200,
    precoUnitario: 3.8,
    precoTotal: 760,
    origem: 'Ceará',
  },
  {
    orderId: 'ORDER-006',
    listingId: '6',
    loteId: 'LOTE-006',
    produtor: '0x6234567890123456789012345678901234567890',
    dataCompra: Date.now() - 2419200000,
    dataEntrega: Date.now() - 604800000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 120,
    precoUnitario: 4.5,
    precoTotal: 540,
    origem: 'Espírito Santo',
  },
  {
    orderId: 'ORDER-007',
    listingId: '7',
    loteId: 'LOTE-007',
    produtor: '0x7234567890123456789012345678901234567890',
    dataCompra: Date.now() - 172800000,
    dataEntrega: Date.now() + 432000000,
    status: DeliveryStatus.Transportando,
    quantidadeKg: 90,
    precoUnitario: 5.9,
    precoTotal: 531,
    origem: 'Mato Grosso',
  },
  {
    orderId: 'ORDER-008',
    listingId: '8',
    loteId: 'LOTE-008',
    produtor: '0x8234567890123456789012345678901234567890',
    dataCompra: Date.now() - 345600000,
    dataEntrega: Date.now() + 7200000,
    status: DeliveryStatus.Emitido,
    quantidadeKg: 170,
    precoUnitario: 3.2,
    precoTotal: 544,
    origem: 'Goiás',
  },
  {
    orderId: 'ORDER-009',
    listingId: '9',
    loteId: 'LOTE-009',
    produtor: '0x9234567890123456789012345678901234567890',
    dataCompra: Date.now() - 3024000000,
    dataEntrega: Date.now() - 1209600000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 210,
    precoUnitario: 4.8,
    precoTotal: 1008,
    origem: 'Paraná',
  },
  {
    orderId: 'ORDER-010',
    listingId: '10',
    loteId: 'LOTE-010',
    produtor: '0xa234567890123456789012345678901234567890',
    dataCompra: Date.now() - 432000000,
    dataEntrega: Date.now() + 259200000,
    status: DeliveryStatus.Aguardando,
    quantidadeKg: 130,
    precoUnitario: 3.6,
    precoTotal: 468,
    origem: 'Santa Catarina',
  },
  {
    orderId: 'ORDER-011',
    listingId: '11',
    loteId: 'LOTE-011',
    produtor: '0xb234567890123456789012345678901234567890',
    dataCompra: Date.now() - 518400000,
    dataEntrega: Date.now() + 172800000,
    status: DeliveryStatus.Transportando,
    quantidadeKg: 95,
    precoUnitario: 5.1,
    precoTotal: 484.5,
    origem: 'Rio Grande do Sul',
  },
  {
    orderId: 'ORDER-012',
    listingId: '12',
    loteId: 'LOTE-012',
    produtor: '0xc234567890123456789012345678901234567890',
    dataCompra: Date.now() - 2592000000,
    dataEntrega: Date.now() - 864000000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 160,
    precoUnitario: 4.2,
    precoTotal: 672,
    origem: 'Tocantins',
  },
];

type StatusFilter = 'Todos' | DeliveryStatus;

export default function BuyerOrdersPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [producerFilter, setProducerFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Aplicar filtros
  const filteredPurchases = useMemo(() => {
    let result = [...MOCK_PURCHASES];

    // Filtro por período
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(p => p.dataCompra >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // fim do dia
      result = result.filter(p => p.dataCompra <= end);
    }

    // Filtro por status
    if (statusFilter !== 'Todos') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Filtro por produtor
    if (producerFilter) {
      const search = producerFilter.toLowerCase();
      result = result.filter(p => p.produtor.toLowerCase().includes(search));
    }

    return result;
  }, [startDate, endDate, statusFilter, producerFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Utilitários
  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return 'Desconectado';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Aguardando': 'var(--status-aguardando)',
      'Emitido': 'var(--status-emitido)',
      'Transportando': 'var(--status-transportando)',
      'Entregue': 'var(--status-entregue)',
      'Rejeitado': 'var(--status-rejeitado)',
    };
    return colors[status] || 'var(--texto-2)';
  };

  const getStatusBgColor = (status: string) => {
    const colors: Record<string, string> = {
      'Aguardando': 'var(--status-aguardando-bg)',
      'Emitido': 'var(--status-emitido-bg)',
      'Transportando': 'var(--status-transportando-bg)',
      'Entregue': 'var(--status-entregue-bg)',
      'Rejeitado': 'var(--status-rejeitado-bg)',
    };
    return colors[status] || 'var(--sup-2)';
  };

  // Função para renderizar timeline dots
  const renderTimelineDots = (status: string) => {
    const statusOrder: Record<string, number> = {
      'Aguardando': 1,
      'Emitido': 2,
      'Transportando': 3,
      'Entregue': 4,
    };
    const currentStep = statusOrder[status] || 0;

    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                step <= currentStep
                  ? 'var(--verde-600)'
                  : 'var(--linha)',
              transition: 'all var(--t-rapida)',
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'Georgia, serif',
          fontSize: '28px',
          color: 'var(--texto-1)',
          fontWeight: 600,
        }}
      >
        Meus Pedidos
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--texto-2)',
          fontSize: '14px',
        }}
      >
        Acompanhe e gerencie todos os seus pedidos de compra
      </p>

      {/* Filtros */}
      <div
        style={{
          background: 'var(--sup-1)',
          borderRadius: 'var(--raio)',
          border: '1px solid var(--linha)',
          padding: 'var(--e-4)',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--e-3)',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              marginBottom: 'var(--e-2)',
              letterSpacing: '0.5px',
            }}
          >
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: 'var(--e-2) var(--e-3)',
              borderRadius: 'var(--raio-xs)',
              border: '1px solid var(--linha-forte)',
              background: 'var(--sup-1)',
              fontSize: '13px',
              color: 'var(--texto-1)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              marginBottom: 'var(--e-2)',
              letterSpacing: '0.5px',
            }}
          >
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: 'var(--e-2) var(--e-3)',
              borderRadius: 'var(--raio-xs)',
              border: '1px solid var(--linha-forte)',
              background: 'var(--sup-1)',
              fontSize: '13px',
              color: 'var(--texto-1)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              marginBottom: 'var(--e-2)',
              letterSpacing: '0.5px',
            }}
          >
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: 'var(--e-2) var(--e-3)',
              borderRadius: 'var(--raio-xs)',
              border: '1px solid var(--linha-forte)',
              background: 'var(--sup-1)',
              fontSize: '13px',
              color: 'var(--texto-1)',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <option value="Todos">Todos</option>
            <option value="Aguardando">Aguardando</option>
            <option value="Emitido">Emitido</option>
            <option value="Transportando">Transportando</option>
            <option value="Entregue">Entregue</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              marginBottom: 'var(--e-2)',
              letterSpacing: '0.5px',
            }}
          >
            Produtor (Endereço)
          </label>
          <input
            type="text"
            placeholder="Ex: 0x1234..."
            value={producerFilter}
            onChange={(e) => {
              setProducerFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: 'var(--e-2) var(--e-3)',
              borderRadius: 'var(--raio-xs)',
              border: '1px solid var(--linha-forte)',
              background: 'var(--sup-1)',
              fontSize: '13px',
              color: 'var(--texto-1)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Resultados */}
      <div
        style={{
          background: 'var(--sup-1)',
          borderRadius: 'var(--raio)',
          border: '1px solid var(--linha)',
          overflow: 'hidden',
          boxShadow: 'var(--sombra-2)',
          marginBottom: '24px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--sup-2)', borderBottom: '1px solid var(--linha)' }}>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                ID
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Lote
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Produtor
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Data Compra
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Entrega
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Timeline
              </th>
              <th
                style={{
                  padding: 'var(--e-4)',
                  textAlign: 'right',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--texto-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.map((purchase, idx) => (
              <tr
                key={purchase.orderId}
                style={{
                  borderBottom: idx < paginatedPurchases.length - 1 ? '1px solid var(--linha)' : 'none',
                  background: idx % 2 === 0 ? 'var(--sup-1)' : 'var(--fundo)',
                }}
              >
                <td
                  style={{
                    padding: 'var(--e-4)',
                    fontSize: '13px',
                    color: 'var(--texto-1)',
                    fontWeight: 500,
                  }}
                >
                  {purchase.orderId}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    fontSize: '13px',
                    color: 'var(--texto-2)',
                  }}
                >
                  {purchase.loteId}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    fontSize: '13px',
                    color: 'var(--texto-2)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {truncateAddress(purchase.produtor)}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    fontSize: '13px',
                    color: 'var(--texto-2)',
                  }}
                >
                  {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    fontSize: '13px',
                    color: 'var(--texto-2)',
                  }}
                >
                  {new Date(purchase.dataEntrega).toLocaleDateString('pt-BR')}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      background: getStatusBgColor(purchase.status),
                      color: getStatusColor(purchase.status),
                      padding: 'var(--e-1) var(--e-2)',
                      borderRadius: 'var(--raio-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {purchase.status}
                  </div>
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'center',
                  }}
                >
                  {renderTimelineDots(purchase.status)}
                </td>
                <td
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'right',
                  }}
                >
                  <Link
                    href={`/buyer/orders/${purchase.orderId}`}
                    style={{
                      display: 'inline-block',
                      background: 'var(--verde-100)',
                      color: 'var(--verde-600)',
                      border: '1px solid #d1e4d8',
                      padding: 'var(--e-2) var(--e-3)',
                      borderRadius: 'var(--raio-xs)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all var(--t-rapida)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#d1e4d8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--verde-100)';
                    }}
                  >
                    Rastrear
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--e-3)',
          marginBottom: '32px',
        }}
      >
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: 'var(--e-2) var(--e-3)',
            background: currentPage === 1 ? 'var(--sup-2)' : 'var(--verde-100)',
            color: currentPage === 1 ? 'var(--texto-3)' : 'var(--verde-600)',
            border: '1px solid var(--linha)',
            borderRadius: 'var(--raio-xs)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          ← Anterior
        </button>

        <span
          style={{
            fontSize: '13px',
            color: 'var(--texto-2)',
            fontWeight: '500',
          }}
        >
          Página {currentPage} de {totalPages || 1}
        </span>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: 'var(--e-2) var(--e-3)',
            background: currentPage === totalPages ? 'var(--sup-2)' : 'var(--verde-100)',
            color: currentPage === totalPages ? 'var(--texto-3)' : 'var(--verde-600)',
            border: '1px solid var(--linha)',
            borderRadius: 'var(--raio-xs)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          Próxima →
        </button>
      </div>

      {/* Info de resultados */}
      <div style={{ marginBottom: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: '0', fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>{filteredPurchases.length} resultado(s)</strong> encontrado(s) ·{' '}
          {paginatedPurchases.length === 0
            ? 'Nenhum pedido encontrado'
            : `Exibindo ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
                currentPage * itemsPerPage,
                filteredPurchases.length
              )} de ${filteredPurchases.length}`}
        </p>
      </div>
    </div>
  );
}
