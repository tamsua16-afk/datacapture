'use client'

import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export interface ReactEChartsProps {
  option: echarts.EChartsOption
  style?: React.CSSProperties
  className?: string
  loading?: boolean
}

export function ReactECharts({ option, style, className, loading }: ReactEChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, 'dark', {
        renderer: 'canvas',
      })
    }

    const instance = chartInstance.current
    if (loading) {
      instance.showLoading({
        text: 'Đang tải biểu đồ...',
        color: '#38bdf8',
        textColor: '#cbd5e1',
        maskColor: 'rgba(15, 23, 42, 0.6)',
      })
    } else {
      instance.hideLoading()
      instance.setOption({
        backgroundColor: 'transparent',
        ...option,
      })
    }

    const handleResize = () => {
      instance.resize()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [option, loading])

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: '260px', ...style }}
    />
  )
}
