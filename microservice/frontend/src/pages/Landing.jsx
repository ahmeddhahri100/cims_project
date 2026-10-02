import React from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Landing() {
    const { t } = useTranslation()
    return (
        <div className="landing">
            <Header />
            <Hero />

            <main className="container" style={{ marginTop: '50px', marginBottom: '100px' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <span className="hero-tag">{t('landing.microservices')}</span>
                    <h2 style={{ fontSize: '36px', color: 'var(--cims-primary)' }}>{t('landing.title')}</h2>
                    <p style={{ maxWidth: '700px', margin: '20px auto', color: 'var(--cims-text-light)' }}>{t('landing.desc')}</p>
                </div>

                <div className="info-grid">
                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--cims-primary)" strokeWidth="1.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                        <h3 className="info-card-title">{t('landing.auth_title')}</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>{t('landing.auth_desc')}</p>
                        <Link to="/" className="btn btn-outline" style={{ fontSize: '12px' }}>{t('landing.auth_cta')}</Link>
                    </div>
                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--cims-primary)" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        </div>
                        <h3 className="info-card-title">{t('landing.patient_title')}</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>{t('landing.patient_desc')}</p>
                        <Link to="/profile" className="btn btn-outline" style={{ fontSize: '12px' }}>{t('landing.patient_cta')}</Link>
                    </div>
                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--cims-primary)" strokeWidth="1.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        </div>
                        <h3 className="info-card-title">{t('landing.appointment_title')}</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>{t('landing.appointment_desc')}</p>
                        <Link to="/appointments" className="btn btn-outline" style={{ fontSize: '12px' }}>{t('landing.appointment_cta')}</Link>
                    </div>
                </div>
            </main>

            <footer style={{ backgroundColor: 'var(--cims-gray-bg)', padding: '60px 0', borderTop: '1px solid var(--cims-border)' }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
                    <div>
                        <div className="logo-text">
                            <h1 style={{ color: 'var(--cims-primary)' }}>{t('app.title')}</h1>
                            <p style={{ fontSize: '10px' }}>{t('landing.footer_brand')}</p>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>{t('landing.footer_links')}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_contact')}</li>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_offers')}</li>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_projects')}</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>{t('landing.footer_products')}</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_esante')}</li>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_rh')}</li>
                            <li style={{ marginBottom: '10px' }}>{t('landing.footer_hospital')}</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>{t('landing.footer_newsletter')}</h4>
                        <p style={{ fontSize: '12px', marginBottom: '15px' }}>{t('landing.footer_newsletter_desc')}</p>
                        <div style={{ display: 'flex' }}>
                            <input type="email" placeholder={t('landing.footer_newsletter_placeholder')} style={{ padding: '8px', border: '1px solid var(--cims-border)', borderRadius: '4px 0 0 4px', flex: 1 }} />
                            <button className="btn btn-primary" style={{ padding: '8px 15px', borderRadius: '0 4px 4px 0' }}>OK</button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
