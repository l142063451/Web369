/**
 * Sankey Budget Explorer
 * Visualizes budget allocation and spending flows using d3-sankey
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { select } from 'd3-selection'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import type { BudgetSummary } from '@/lib/projects/service'

interface SankeyNode {
  id: string
  name: string
  value?: number
  category?: string
}

interface SankeyLink {
  source: string
  target: string
  value: number
}

interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

interface BudgetSankeyProps {
  budgetSummary: BudgetSummary
  width?: number
  height?: number
  className?: string
}

export default function BudgetSankey({
  budgetSummary,
  width = 800,
  height = 400,
  className = ''
}: BudgetSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current || !budgetSummary) return

    try {
      drawSankeyDiagram()
      setIsLoaded(true)
      setError(null)
    } catch (err) {
      console.error('Failed to draw Sankey diagram:', err)
      setError('Failed to render budget visualization')
    }
  }, [budgetSummary, width, height])

  const transformBudgetData = (): SankeyData => {
    const nodes: SankeyNode[] = []
    const links: SankeyLink[] = []

    // Source node for total budget
    nodes.push({ 
      id: 'budget', 
      name: `Budget\n₹${budgetSummary.totalAllocated.toLocaleString()}`,
      value: budgetSummary.totalAllocated 
    })

    // Category nodes
    Object.entries(budgetSummary.categories).forEach(([category, data]) => {
      const categoryId = `category-${category}`
      nodes.push({
        id: categoryId,
        name: category,
        value: data.allocated,
        category: 'category'
      })

      // Link from budget to category
      links.push({
        source: 'budget',
        target: categoryId,
        value: data.allocated
      })

      // Spending breakdown for each category
      if (data.spent > 0) {
        const spentId = `spent-${category}`
        nodes.push({
          id: spentId,
          name: `Spent\n₹${data.spent.toLocaleString()}`,
          value: data.spent,
          category: 'spent'
        })
        links.push({
          source: categoryId,
          target: spentId,
          value: data.spent
        })
      }

      if (data.committed > 0) {
        const committedId = `committed-${category}`
        nodes.push({
          id: committedId,
          name: `Committed\n₹${data.committed.toLocaleString()}`,
          value: data.committed,
          category: 'committed'
        })
        links.push({
          source: categoryId,
          target: committedId,
          value: data.committed
        })
      }

      const remaining = data.allocated - data.spent - data.committed
      if (remaining > 0) {
        const remainingId = `remaining-${category}`
        nodes.push({
          id: remainingId,
          name: `Available\n₹${remaining.toLocaleString()}`,
          value: remaining,
          category: 'available'
        })
        links.push({
          source: categoryId,
          target: remainingId,
          value: remaining
        })
      }
    })

    return { nodes, links }
  }

  const drawSankeyDiagram = () => {
    if (!svgRef.current) return

    const svg = select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous content

    const data = transformBudgetData()
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Color scale for different node types
    const colorScale = scaleOrdinal<string>()
      .domain(['budget', 'category', 'spent', 'committed', 'available'])
      .range(['#1f77b4', '#ff7f0e', '#d62728', '#ff9500', '#2ca02c'])

    // Create sankey generator
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 1]])

    // Transform data
    const sankeyData = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    })

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Draw links
    g.selectAll('.link')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', sankeyLinkHorizontal())
      .style('fill', 'none')
      .style('stroke', d => {
        const sourceNode = d.source as any
        return colorScale(sourceNode.category || 'budget')
      })
      .style('stroke-opacity', 0.4)
      .style('stroke-width', d => Math.max(1, d.width || 0))
      .append('title')
      .text(d => {
        const source = d.source as any
        const target = d.target as any
        return `${source.name} → ${target.name}\n₹${d.value?.toLocaleString()}`
      })

    // Draw nodes
    const node = g.selectAll('.node')
      .data(sankeyData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)

    // Node rectangles
    node
      .append('rect')
      .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .style('fill', d => colorScale(d.category || 'budget'))
      .style('stroke', '#000')
      .style('stroke-width', '1px')
      .style('opacity', 0.8)
      .append('title')
      .text(d => `${d.name}\n₹${d.value?.toLocaleString()}`)

    // Node labels
    node
      .append('text')
      .attr('x', d => ((d.x1 || 0) - (d.x0 || 0)) / 2)
      .attr('y', d => ((d.y1 || 0) - (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .style('text-shadow', '1px 1px 1px rgba(0,0,0,0.5)')
      .selectAll('tspan')
      .data(d => d.name.split('\n'))
      .enter()
      .append('tspan')
      .attr('x', function() {
        const parentNode = this.parentNode as any
        const rect = parentNode.parentNode.querySelector('rect')
        return rect ? (rect.width.baseVal.value / 2) : 0
      })
      .attr('dy', (d, i) => i === 0 ? '-0.2em' : '1.2em')
      .text(d => d)
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center border border-red-200 bg-red-50 rounded-lg ${className}`}>
        <div className="text-center text-red-600 p-8">
          <p className="text-sm font-medium">Visualization Error</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Budget Flow Analysis</h3>
        <p className="text-sm text-gray-600">
          Allocation and spending across project categories
        </p>
      </div>

      {/* Sankey Diagram */}
      <div className="p-4">
        <div className="relative">
          <svg ref={svgRef} className="w-full" />
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Generating visualization...</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Total Budget</p>
            <p className="text-lg font-bold text-blue-800">
              ₹{budgetSummary.totalAllocated.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-red-600 font-medium">Spent</p>
            <p className="text-lg font-bold text-red-800">
              ₹{budgetSummary.totalSpent.toLocaleString()}
            </p>
            <p className="text-xs text-red-600">
              {((budgetSummary.totalSpent / budgetSummary.totalAllocated) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">Committed</p>
            <p className="text-lg font-bold text-orange-800">
              ₹{budgetSummary.totalCommitted.toLocaleString()}
            </p>
            <p className="text-xs text-orange-600">
              {((budgetSummary.totalCommitted / budgetSummary.totalAllocated) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Available</p>
            <p className="text-lg font-bold text-green-800">
              ₹{budgetSummary.remaining.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">
              {((budgetSummary.remaining / budgetSummary.totalAllocated) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}