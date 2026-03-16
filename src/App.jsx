import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import MainPage from './pages/MainPage'
import StatisticsPage from './pages/StatisticsPage'
import MyNumbersPage from './pages/MyNumbersPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<MainPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="my-numbers" element={<MyNumbersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
