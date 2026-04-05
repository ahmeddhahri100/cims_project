import { useState } from "react";

const HeartPulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <path d="M3 10h18" />
    <path d="M16 14h.01" />
    <path d="M12 18h.01" />
    <path d="M8 18h.01" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const StethoscopeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.8 2.3A.3.3 0 0 1 5 2h14a.3.3 0 0 1 .2.3v3.4a.3.3 0 0 1-.2.3l-3.2 1.8a4.6 4.6 0 0 1-4.6 0l-3.2-1.8a.3.3 0 0 1-.2-.3V2.3z" />
    <path d="M8 15v5" />
    <path d="M16 15v5" />
    <path d="M12 15v5" />
    <path d="M9 20h6" />
    <path d="M12 15V8a2 2 0 0 0-2-2H8" />
  </svg>
);

const EmailIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");

    if (name === "password") {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        }),
      });

      const data = await response.json();

      if (data.token) {
        setSuccess(true);
        localStorage.setItem("cims_token", data.token);
        localStorage.setItem("cims_user", JSON.stringify(data.user));

        setTimeout(() => {
          window.location.href = "/profile";
        }, 1500);
      } else {
        setError(data.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const strengthLabels = [
    "Très faible",
    "Faible",
    "Moyen",
    "Fort",
    "Très fort",
  ];
  const strengthColors = [
    "#FF5252",
    "#FFB300",
    "#FFB300",
    "#00C853",
    "#00C853",
  ];

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-gradient auth-bg-gradient-1" />
        <div className="auth-bg-gradient auth-bg-gradient-2" />
        <div className="auth-bg-gradient auth-bg-gradient-3" />
        <div className="auth-particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                "--delay": `${i * 0.5}s`,
                "--x": `${Math.random() * 100}%`,
                "--duration": `${15 + Math.random() * 20}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="auth-container" style={{ maxWidth: "1100px" }}>
        <aside className="auth-brand-panel">
          <div className="auth-brand-content">
            <a href="/" className="auth-logo" style={{ cursor: "pointer" }}>
              <div className="auth-logo-icon">
                <HeartPulseIcon />
              </div>
              <div className="auth-logo-text">
                <h1>CIMS</h1>
                <span>Santé Numérique</span>
              </div>
            </a>

            <div className="auth-hero">
              <div className="auth-hero-badge">
                <span className="badge-pulse" />
                Inscription
              </div>
              <h2>
                Créez votre
                <br />
                <span className="text-gradient">compte santé</span>
              </h2>
              <p>
                Rejoignez la plateforme de santé numérique .
                Accédez à tous nos services en toute simplicité.
              </p>

              <div className="auth-features">
                <div className="auth-feature">
                  <div className="auth-feature-icon">
                    <CalendarIcon />
                  </div>
                  <div>
                    <strong>Rendez-vous</strong>
                    <span>Prise de RDV en ligne</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon">
                    <StethoscopeIcon />
                  </div>
                  <div>
                    <strong>Suivi médical</strong>
                    <span>Historique complet</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon">
                    <ShieldCheckIcon />
                  </div>
                  <div>
                    <strong>100% Sécurisé</strong>
                    <span>Confidentialité garantie</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <div className="auth-brand-stats">
              <div className="auth-brand-stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Gratuit</span>
              </div>
              <div className="auth-brand-stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Accessible</span>
              </div>
              <div className="auth-brand-stat">
                <span className="stat-number">🔒</span>
                <span className="stat-label">Sécurisé</span>
              </div>
            </div>
            <p>© 2025 CIMS — CIMS</p>
          </div>
        </aside>

        <main className="auth-form-panel">
          <div className="auth-form-header">
            <h3>Créer un compte</h3>
            <p>Remplissez le formulaire ci-dessous</p>
          </div>

          <div className="auth-tabs">
            <button
              className="auth-tab"
              onClick={() => (window.location.href = "/")}
            >
              Se connecter
            </button>
            <button className="auth-tab active">S'inscrire</button>
          </div>

          {error && (
            <div className="auth-alert error">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Compte créé ! Redirection...
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className="input-group">
                <input
                  type="text"
                  name="firstName"
                  className="auth-input"
                  placeholder=" "
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
                <UserIcon />
                <label className="floating-label">
                  <span>Prénom</span>
                </label>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="lastName"
                  className="auth-input"
                  placeholder=" "
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
                <UserIcon />
                <label className="floating-label">
                  <span>Nom</span>
                </label>
              </div>
            </div>

            <div className="input-group">
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder=" "
                value={form.email}
                onChange={handleChange}
                required
              />
              <EmailIcon />
              <label className="floating-label">
                <span>Adresse email</span>
              </label>
            </div>

            {/* Role Selection Cards */}
            <div className="role-selector">
              <label className="role-label">Je suis :</label>
              <div className="role-cards">
                <div
                  className={`role-card ${form.role === "patient" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, role: "patient" })}
                >
                  <div className="role-card-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="role-card-content">
                    <strong>Patient</strong>
                    <span>Prendre rendez-vous</span>
                  </div>
                  {form.role === "patient" && (
                    <div className="role-card-check">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>

                <div
                  className={`role-card ${form.role === "doctor" ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, role: "doctor" })}
                >
                  <div className="role-card-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div className="role-card-content">
                    <strong>Médecin</strong>
                    <span>Gérer mes patients</span>
                  </div>
                  {form.role === "doctor" && (
                    <div className="role-card-check">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="input-group">
              <input
                type="password"
                name="password"
                className="auth-input"
                placeholder=" "
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <LockIcon />
              <label className="floating-label">
                <span>Mot de passe</span>
              </label>
              <button type="button" className="password-toggle">
                <EyeIcon />
              </button>
            </div>

            {form.password && (
              <div className="password-strength">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`password-strength-bar ${
                      passwordStrength >= level
                        ? passwordStrength <= 1
                          ? "weak"
                          : passwordStrength <= 2
                            ? "medium"
                            : "strong"
                        : ""
                    }`}
                    style={{
                      background:
                        passwordStrength >= level
                          ? strengthColors[passwordStrength - 1]
                          : undefined,
                    }}
                  />
                ))}
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color:
                      passwordStrength > 0
                        ? strengthColors[passwordStrength - 1]
                        : "var(--text-muted)",
                    marginLeft: "0.5rem",
                  }}
                >
                  {passwordStrength > 0
                    ? strengthLabels[passwordStrength - 1]
                    : ""}
                </span>
              </div>
            )}

            <div className="input-group">
              <input
                type="password"
                name="confirmPassword"
                className="auth-input"
                placeholder=" "
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
              <LockIcon />
              <label className="floating-label">
                <span>Confirmer le mot de passe</span>
              </label>
            </div>

            <button
              type="submit"
              className={`auth-submit ${loading ? "loading" : ""} ${success ? "success" : ""}`}
              disabled={loading || success}
            >
              {loading && <span className="spinner" />}
              {loading
                ? "Inscription..."
                : success
                  ? "Compte créé !"
                  : "Créer mon compte"}
            </button>

            <div className="auth-link">
              Déjà inscrit ? <a href="/">Se connecter</a>
            </div>

            <div className="auth-rgpd">
              <ShieldCheckIcon />
              <p>
                <strong>Protection de vos données :</strong> En créant un
                compte, vous acceptez nos conditions d'utilisation. Vos données
                personnelles sont protégées par la léglementation applicable.
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
