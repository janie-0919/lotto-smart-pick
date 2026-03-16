import React from 'react'
import { getBallColor } from '../utils/lottoGenerator'
import './LottoBall.scss'

export default function LottoBall({ number, size = 'md', highlight, dim }) {
  const color = getBallColor(number)
  return (
    <div
      className={`lotto-ball lotto-ball--${color} lotto-ball--${size} ${highlight ? 'lotto-ball--highlight' : ''} ${dim ? 'lotto-ball--dim' : ''}`}
    >
      {number}
    </div>
  )
}
