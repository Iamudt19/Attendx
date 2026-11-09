import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, ShieldCheck, Mail, Globe, MapPin, 
  User, Lock, CheckCircle2, ArrowRight, AlertCircle, Sparkles, School 
} from 'lucide-react';
import { InstitutionService, InstitutionRegisterData } from '../services/api';

export const InstitutionRegister: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InstitutionRegisterData>({
    institution_name: '',
    institution_code: '',
    official_email: '',
    domain: '',
    address: '',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ name: string; code: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.institution_name.trim() || !formData.institution_code.trim()) {
        throw new Error('Institution name and code are required.');
      }
      if (!formData.admin_email.trim() || !formData.admin_password.trim()) {
        throw new Error('Administrator email and password are required.');
      }

      const res = await InstitutionService.registerInstitution({
        ...formData,
        institution_code: formData.institution_code.trim().toUpperCase()
      });

      setSuccessInfo({
        name: formData.institution_name,
        code: formData.institution_code.toUpperCase()
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit institution registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENTERPRISE ONBOARDING · TIER 2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Register Academic Institution
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            Establish a verified campus portal on AttendX. Once approved by the Platform Super Admin, your educators and students can onboard seamlessly.
          </p>
        </div>

        {submitted && successInfo ? (
          <div className="swiss-card p-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Verification Request Submitted!</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <span className="font-bold text-emerald-400">{successInfo.name}</span> (Code: <span className="font-mono text-emerald-400">{successInfo.code}</span>) has been queued for Super Administrator approval.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] text-left text-xs space-y-2 font-mono">
              <div className="text-[var(--text-muted)] uppercase tracking-wider text-[10px]">What Happens Next:</div>
              <div className="text-emerald-400">1. Platform Super Admin verifies accreditation and domain.</div>
              <div className="text-[var(--text-secondary)]">2. Your Campus Administrator account is activated automatically.</div>
              <div className="text-[var(--text-secondary)]">3. Teachers can select your campus from the institution registry during signup.</div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="btn-primary px-6 py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2"
              >
                <span>Go to Login Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="swiss-card p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] space-y-6">
            
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Registration Alert</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {/* Section 1: Institution Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-color)]">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>1. Institution & Campus Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Official Institution Name *
                  </label>
                  <input
                    type="text"
                    name="institution_name"
                    required
                    value={formData.institution_name}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University / Apex Institute of Technology"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Unique Institution Code *
                  </label>
                  <input
                    type="text"
                    name="institution_code"
                    required
                    value={formData.institution_code}
                    onChange={handleChange}
                    placeholder="e.g. STANFORD / AIT"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs font-mono uppercase text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Official Domain
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    placeholder="e.g. stanford.edu"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Official Administrative Email *
                  </label>
                  <input
                    type="email"
                    name="official_email"
                    required
                    value={formData.official_email}
                    onChange={handleChange}
                    placeholder="e.g. registrar@institution.edu"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. 450 Serra Mall, Stanford, CA 94305"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Campus Administrator Account */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-color)]">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>2. Campus Administrator Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    name="admin_name"
                    required
                    value={formData.admin_name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Arthur Pendelton"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Admin Login Email *
                  </label>
                  <input
                    type="email"
                    name="admin_email"
                    required
                    value={formData.admin_email}
                    onChange={handleChange}
                    placeholder="admin@campus.edu"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    name="admin_password"
                    required
                    value={formData.admin_password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/login" className="text-xs text-[var(--text-muted)] hover:text-emerald-400 font-sans">
                ← Already have an account? Sign In
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto btn-primary px-8 py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Registering Campus...</span>
                ) : (
                  <>
                    <span>Submit for Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
