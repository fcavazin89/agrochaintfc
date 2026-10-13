'use client';
import { useEffect, useRef } from 'react';
import type { TraceNode } from '@/types/agrochain';

/**
 * TraceChain Component Props
 * 
 * @typedef {Object} TraceChainProps
 * @property {TraceNode[]} nodes - Array of trace nodes to visualize
 * 
 * TraceNode structure:
 * ```
 * {
 *   label: string;          // Node label (e.g., "Colheita", "Processamento")
 *   status: 'DONE' | 'ACTIVE' | 'PENDING';  // Current node status
 * }
 * ```
 */

interface TraceChainProps {
  nodes: TraceNode[];
}

/**
 * TraceChain - SVG-based traceability visualization component
 * 
 * Renders a horizontal timeline of production steps with status indicators.
 * Used to show the path a product takes from farm to consumer.
 * 
 * @component
 * @param {TraceChainProps} props
 * @returns {JSX.Element} A container div with SVG timeline visualization
 * 
 * @example
 * ```tsx
 * const traceSteps = [
 *   { label: '🌱 Plantio', status: 'DONE' },
 *   { label: '🌾 Colheita', status: 'DONE' },
 *   { label: '🏭 Processamento', status: 'ACTIVE' },
 *   { label: '📦 Embalagem', status: 'PENDING' },
 * ];
 * 
 * <TraceChain nodes={traceSteps} />
 * ```
 * 
 * Visual Design:
 * - Green (#1f6440) line connecting all nodes
 * - Node colors: 
 *   - 'DONE': green (#1f6440), r=10
 *   - 'ACTIVE': gold (#b8912a), r=14 (emphasized)
 *   - 'PENDING': gray (#495649), r=10
 * - Labels positioned below nodes, white text
 * 
 * Performance:
 * - Recommended max: 10 nodes per chain
 * - Uses native SVG (no Canvas), lightweight
 * - Re-renders on nodes prop change only
 * - SVG dimensions: responsive width x 280px height
 * 
 * Accessibility:
 * - Nodes should have descriptive labels
 * - Status color should not be only visual indicator
 */
export function TraceChain({ nodes }: TraceChainProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Simple SVG-based visualization of the trace chain
    const width = containerRef.current.clientWidth;
    const height = 280;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.background = '#0b1d12';
    
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(svg);

    // Draw connecting line
    const nodeCount = nodes.length;
    const spacing = (width - 80) / Math.max(nodeCount - 1, 1);
    const y = height / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '40');
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', (width - 40).toString());
    line.setAttribute('y2', y.toString());
    line.setAttribute('stroke', '#2f8f52');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);

    // Draw nodes
    nodes.forEach((node, idx) => {
      const x = 40 + idx * spacing;
      const cx = x;
      const cy = y;

      const color = node.status === 'DONE' ? '#1f6440' : node.status === 'ACTIVE' ? '#b8912a' : '#495649';
      const radius = node.status === 'ACTIVE' ? 14 : 10;

      // Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', color);
      circle.setAttribute('opacity', '0.8');
      svg.appendChild(circle);

      // Label below
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', cx.toString());
      text.setAttribute('y', (cy + 35).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#f3f7f2');
      text.setAttribute('font-weight', '600');
      text.textContent = node.label;
      svg.appendChild(text);
    });
  }, [nodes]);

  return <div ref={containerRef} style={{ height: '280px', borderRadius: '12px', overflow: 'hidden' }} />;
}
