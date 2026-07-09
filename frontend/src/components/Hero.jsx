import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Hero() {
    const { t } = useTranslation()
    return (
        <section className="hero">
            <div className="hero-bg">
                <div style={{
                    width: '100%', height: '100%', backgroundColor: '#e0f2f1',
                    backgroundImage: 'linear-gradient(45deg, #b2dfdb 25%, transparent 25%, transparent 75%, #b2dfdb 75%, #b2dfdb), linear-gradient(45deg, #b2dfdb 25%, transparent 25%, transparent 75%, #b2dfdb 75%, #b2dfdb)',
                    backgroundSize: '40px 40px', backgroundPosition: '0 0, 20px 20px', opacity: 0.3
                }}></div>
            </div>
            <div className="hero-content">
                <span className="hero-tag">{t('hero.tag')}</span>
                <h2>{t('hero.title')}</h2>
                <p>{t('hero.desc')}</p>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn btn-teal">{t('hero.cta_services')}</button>
                    <Link to="/register" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        {t('hero.cta_register')} <span style={{ fontSize: '18px' }}>→</span>
                    </Link>
                </div>
            </div>
            <div className="hero-slanted"></div>
        </section>
    )
}
