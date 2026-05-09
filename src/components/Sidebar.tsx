'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CreditCard,
  Settings,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/payments', label: 'Payments', icon: CreditCard },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}>
            <Zap size={18} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' }}>
              ClientFlow
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              Management System
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/settings" className="nav-item" onClick={() => setMobileOpen(false)}>
          <Settings size={16} strokeWidth={2} />
          Settings
        </Link>
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Version</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>1.0.0</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="sidebar-glow"
        style={{
          width: 240,
          background: '#0d0d0d',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed', bottom: 20, right: 20,
          width: 48, height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
          border: 'none',
          display: 'none',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(255,255,255,0.2)',
          cursor: 'pointer',
        }}
        className="mobile-fab"
      >
        {mobileOpen ? <X size={20} color="#000" /> : <Menu size={20} color="#000" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            display: 'flex',
          }}
        >
          <div
            style={{ flex: 1, background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{
            width: 240,
            background: '#0d0d0d',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
