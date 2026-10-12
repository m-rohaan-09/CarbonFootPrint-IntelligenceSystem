import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

const INDUSTRIES = [
  'Manufacturing', 'Energy & Utilities', 'Oil & Gas', 'Transportation & Logistics',
  'Construction', 'Agriculture', 'Mining', 'Chemicals', 'Textiles',
  'Food & Beverage', 'Healthcare', 'IT & Telecom', 'Financial Services',
  'Education', 'Retail', 'Hospitality', 'Other',
];

const STEPS = [
  { id: 1, label: 'Company Info', icon: 'business' },
  { id: 2, label: 'Location', icon: 'location_on' },
  { id: 3, label: 'Departments', icon: 'account_tree' },
  { id: 4, label: 'Review', icon: 'fact_check' },
];

export default function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState(null);

  const [form, setForm] = useState({
    name: '', industry: '', registrationNumber: '', website: '',
    employeeCount: '', fiscalYearStart: '', baselineYear: new Date().getFullYear() - 1,
    country: 'Pakistan', province: '', city: '', address: '',
  });

  const [departments, setDepartments] = useState([
    { name: '', description: '', location: '' },
  ]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const addDepartment = () => {
    setDepartments([...departments, { name: '', description: '', location: '' }]);
  };

  const removeDepartment = (index) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const updateDepartment = (index, field, value) => {
    const updated = [...departments];
    updated[index][field] = value;
    setDepartments(updated);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim()) return 'Company name is required';
      if (!form.industry) return 'Please select an industry';
    }
    if (step === 2) {
      if (!form.country.trim()) return 'Country is required';
      if (!form.city.trim()) return 'City is required';
    }
    if (step === 3) {
      const validDepts = departments.filter((d) => d.name.trim());
      if (validDepts.length === 0) return 'Add at least one department';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Create company
      const companyPayload = { ...form };
      if (companyPayload.employeeCount) {
        companyPayload.employeeCount = parseInt(companyPayload.employeeCount);
      }
      if (companyPayload.baselineYear) {
        companyPayload.baselineYear = parseInt(companyPayload.baselineYear);
      }

      const { data: companyData } = await API.post('/company', companyPayload);
      const createdId = companyData.company.id;
      setCompanyId(createdId);

      // Step 2: Create departments
      const validDepts = departments.filter((d) => d.name.trim());
      for (const dept of validDepts) {
        await API.post('/departments', { ...dept, companyId: createdId });
      }

      // Step 3: Mark onboarding as completed
      await API.put(`/company/${createdId}`, { onboardingCompleted: true });

      navigate('/company/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-on-surface">Company Onboarding</h1>
          <p className="text-on-surface-variant mt-2">Set up your company profile to start tracking emissions</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8 gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                step === s.id ? 'bg-primary text-on-primary' :
                step > s.id ? 'bg-primary-container text-on-primary-container' :
                'bg-surface-container-high text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${step > s.id ? 'bg-primary' : 'bg-outline-variant'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-surface-bright rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-on-surface mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Company Name *</label>
                  <input name="name" value={form.name} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="Enter company name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Industry *</label>
                  <select name="industry" value={form.industry} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface">
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Registration Number</label>
                  <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="e.g. NTN / SECP" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Website</label>
                  <input name="website" value={form.website} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Number of Employees</label>
                  <input name="employeeCount" type="number" min="1" value={form.employeeCount} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="e.g. 250" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Fiscal Year Start</label>
                  <input name="fiscalYearStart" type="date" value={form.fiscalYearStart} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Baseline Year</label>
                  <input name="baselineYear" type="number" min="2000" max="2100" value={form.baselineYear} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-on-surface mb-4">Location Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Country *</label>
                  <input name="country" value={form.country} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="e.g. Pakistan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Province / State</label>
                  <input name="province" value={form.province} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="e.g. Punjab" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">City *</label>
                  <input name="city" value={form.city} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface"
                    placeholder="e.g. Lahore" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Full Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface resize-none"
                    placeholder="Street address, building, etc." />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Departments */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-on-surface">Departments</h2>
                <button onClick={addDepartment}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Department
                </button>
              </div>
              <p className="text-sm text-on-surface-variant">Add departments or divisions within your company to categorize emissions.</p>

              <div className="space-y-4">
                {departments.map((dept, index) => (
                  <div key={index} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-on-surface">Department {index + 1}</span>
                      {departments.length > 1 && (
                        <button onClick={() => removeDepartment(index)}
                          className="text-error hover:text-error/80 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input value={dept.name} onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                        placeholder="Department name *" />
                      <input value={dept.description} onChange={(e) => updateDepartment(index, 'description', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                        placeholder="Description (optional)" />
                      <input value={dept.location} onChange={(e) => updateDepartment(index, 'location', e.target.value)}
                        className="px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-on-surface text-sm"
                        placeholder="Location (optional)" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-on-surface mb-4">Review & Confirm</h2>

              {/* Company info review */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">business</span>
                  Company Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-on-surface-variant">Name:</span> <span className="text-on-surface font-medium">{form.name}</span></div>
                  <div><span className="text-on-surface-variant">Industry:</span> <span className="text-on-surface font-medium">{form.industry}</span></div>
                  {form.registrationNumber && <div><span className="text-on-surface-variant">Reg #:</span> <span className="text-on-surface font-medium">{form.registrationNumber}</span></div>}
                  {form.employeeCount && <div><span className="text-on-surface-variant">Employees:</span> <span className="text-on-surface font-medium">{form.employeeCount}</span></div>}
                  <div><span className="text-on-surface-variant">Baseline Year:</span> <span className="text-on-surface font-medium">{form.baselineYear}</span></div>
                </div>
              </div>

              {/* Location review */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  Location
                </h3>
                <div className="text-sm text-on-surface">
                  {[form.address, form.city, form.province, form.country].filter(Boolean).join(', ')}
                </div>
              </div>

              {/* Departments review */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                  Departments ({departments.filter((d) => d.name.trim()).length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {departments.filter((d) => d.name.trim()).map((dept, i) => (
                    <span key={i} className="px-3 py-1.5 bg-primary-container/30 text-on-surface rounded-lg text-sm font-medium">
                      {dept.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline-variant/20">
            {step > 1 ? (
              <button onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                Next
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
    </div>
  );
}
