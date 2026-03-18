import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import './Layout.scss'

export default function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <div className="header__inner">
          <div className="header__logo">
            <span className="logo-icon">🎱</span>
            <span className="logo-text">로또 스마트픽</span>
          </div>
          <nav className="header__nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              번호 생성
            </NavLink>
            <NavLink to="/statistics" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              통계
            </NavLink>
            <NavLink to="/my-numbers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              내 번호
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>본 서비스는 통계 기반 균형 분산형 번호 추천을 제공합니다. 당첨을 보장하지 않습니다.</p>
        <p className="copyright">© {new Date().getFullYear()} <span>Juyeon Lee</span>. All rights reserved.</p>
      </footer>
    </div>
  )
}
