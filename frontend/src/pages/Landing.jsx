import React from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import { Link } from 'react-router-dom'

export default function Landing() {
    return (
        <div className="landing">
            <Header />
            <Hero />

            <main className="container" style={{ marginTop: '50px', marginBottom: '100px' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <span className="hero-tag">NOS MICROSERVICES</span>
                    <h2 style={{ fontSize: '36px', color: 'var(--cims-primary)' }}>Solutions Digitales Intégrées</h2>
                    <p style={{ maxWidth: '700px', margin: '20px auto', color: 'var(--cims-text-light)' }}>
                        Découvrez nos services micro-architecturés pour une gestion de santé fluide et sécurisée.
                    </p>
                </div>

                <div className="info-grid">
                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🔐</div>
                        <h3 className="info-card-title">Authentification</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>
                            Service de sécurité centralisé pour la gestion des accès et des identités.
                        </p>
                        <Link to="/" className="btn btn-outline" style={{ fontSize: '12px' }}>ACCÉDER</Link>
                    </div>

                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>👤</div>
                        <h3 className="info-card-title">Gestion Patients</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>
                            Suivi complet des dossiers médicaux et informations personnelles des patients.
                        </p>
                        <Link to="/profile" className="btn btn-outline" style={{ fontSize: '12px' }}>CONSULTER</Link>
                    </div>

                    <div className="info-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>📅</div>
                        <h3 className="info-card-title">Rendez-vous</h3>
                        <p style={{ color: 'var(--cims-text-light)', marginBottom: '20px' }}>
                            Planification intelligence et gestion des consultations médicales.
                        </p>
                        <Link to="/appointments" className="btn btn-outline" style={{ fontSize: '12px' }}>RÉSERVER</Link>
                    </div>
                </div>
            </main>

            <footer style={{ backgroundColor: 'var(--cims-gray-bg)', padding: '60px 0', borderTop: '1px solid var(--cims-border)' }}>
                <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px' }}>
                    <div>
                        <div className="logo-text">
                            <h1 style={{ color: 'var(--cims-primary)' }}>CIMS</h1>
                            <p style={{ fontSize: '10px' }}>DIGITAL HEALTH TUNISIA</p>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>LIENS UTILES</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
                            <li style={{ marginBottom: '10px' }}>Contactez-nous</li>
                            <li style={{ marginBottom: '10px' }}>Appels d'offres</li>
                            <li style={{ marginBottom: '10px' }}>Projets en cours</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>PRODUITS</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
                            <li style={{ marginBottom: '10px' }}>E-Santé</li>
                            <li style={{ marginBottom: '10px' }}>Solutions RH</li>
                            <li style={{ marginBottom: '10px' }}>Gestion Hospitalière</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '20px', color: 'var(--cims-primary)' }}>NEWSLETTER</h4>
                        <p style={{ fontSize: '12px', marginBottom: '15px' }}>Restez informé des dernières innovations.</p>
                        <div style={{ display: 'flex' }}>
                            <input type="email" placeholder="Votre email" style={{ padding: '8px', border: '1px solid var(--cims-border)', borderRadius: '4px 0 0 4px', flex: 1 }} />
                            <button className="btn btn-primary" style={{ padding: '8px 15px', borderRadius: '0 4px 4px 0' }}>OK</button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
