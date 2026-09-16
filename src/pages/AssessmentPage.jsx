import { useState } from 'react'
import { ArrowRight, Check, ClipboardList, ShieldCheck } from 'lucide-react'
import { useAssessment } from '../state/AssessmentState'

// ── Shared style helpers (matching existing CyberRisk AI design) ──────────────

const card = {
  background: 'rgba(16,23,34,.97)', border: '1px solid #263142',
  borderRadius: '10px', padding: '28px 28px',
}
const label = {
  display: 'block', color: '#8290a4', fontSize: '11px', marginBottom: '14px',
}
const inp = {
  width: '100%', background: '#17202d', border: '1px solid #263447', borderRadius: '6px',
  padding: '9px 12px', color: '#f2f5f8', fontSize: '13px', outline: 'none',
  marginTop: '6px', fontFamily: 'inherit', boxSizing: 'border-box',
}
const sel = { ...inp, cursor: 'pointer' }
const errBox = {
  background: 'rgba(248,121,120,.1)', border: '1px solid rgba(248,121,120,.3)',
  borderRadius: '5px', color: '#f87978', fontSize: '11px', padding: '10px 13px',
  marginBottom: '14px', lineHeight: 1.5,
}
const radioGroup = (selected, value) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
  padding: '7px 13px', borderRadius: '5px', fontSize: '12px', marginRight: '8px', marginBottom: '6px',
  border: `1px solid ${selected === value ? '#52d6cc' : '#263447'}`,
  background: selected === value ? 'rgba(82,214,204,.1)' : '#17202d',
  color: selected === value ? '#52d6cc' : '#8290a4',
  fontFamily: 'inherit', transition: 'all .12s',
})

const FEEDBACK = {
  mfa: {
    None: ['risk', 'High security concern: MFA is not enabled. Enable multi-factor authentication for critical accounts and internet-facing services.'],
    Partial: ['moderate', 'Moderate security: MFA is enabled for some users or systems. Extend it to all critical accounts.'],
    Full: ['good', 'Strong security: Full MFA significantly reduces the risk of unauthorized account access.'],
  },
  endpoint_protection: {
    None: ['risk', 'High security concern: No endpoint protection is configured. Devices may be exposed to malware and unauthorized activity.'],
    Basic: ['moderate', 'Moderate protection: Basic endpoint protection is present, but advanced detection may improve resilience.'],
    Advanced: ['good', 'Strong security: Advanced endpoint protection provides stronger protection and monitoring for devices.'],
  },
  firewall_waf: {
    None: ['risk', 'High exposure concern: No firewall/WAF protection is configured for internet-facing traffic.'],
    Basic: ['moderate', 'Moderate protection: Basic network protection is enabled. Review rules and monitoring regularly.'],
    Advanced: ['good', 'Strong security: Advanced firewall/WAF protection provides stronger control over network and web traffic.'],
  },
  backup: {
    None: ['risk', 'Critical resilience concern: No backup strategy is configured. A destructive incident could cause significant data loss.'],
    Weekly: ['moderate', 'Moderate resilience: Weekly backups provide some protection, but more frequent backups may reduce data loss.'],
    Daily: ['good', 'Strong resilience: Daily backups improve recovery capability after ransomware or data-loss incidents.'],
  },
  security_awareness: {
    None: ['risk', 'Human-risk concern: Without awareness training, users may be more vulnerable to phishing and social engineering.'],
    Occasional: ['moderate', 'Moderate awareness: Periodic training provides some protection, but regular activities are recommended.'],
    Regular: ['good', 'Strong practice: Regular awareness training helps reduce phishing and social-engineering risk.'],
  },
  patching: {
    Poor: ['risk', 'High vulnerability concern: Poor patch management can leave known vulnerabilities exploitable.'],
    Moderate: ['moderate', 'Moderate vulnerability exposure: Patch management exists but should be monitored consistently.'],
    Good: ['good', 'Strong security practice: Consistent patch management reduces exposure to known vulnerabilities.'],
  },
  incident_response: {
    No: ['risk', 'Response concern: No incident-response capability is defined. Establish and test a basic plan.'],
    Partial: ['moderate', 'Moderate readiness: Some response procedures exist, but they should be formalized and tested.'],
    Yes: ['good', 'Strong readiness: A defined incident-response capability improves containment and recovery.'],
  },
  cloud_usage: {
    No: ['moderate', 'No cloud services are declared in this assessment.'],
    Partial: ['moderate', 'Cloud usage is declared. Review identity controls, secure configuration, and monitoring.'],
    Yes: ['good', 'Cloud usage itself is not a security weakness. Ensure strong identity controls, MFA, secure configuration, and monitoring.'],
  },
  remote_workers: {
    No: ['good', 'No remote-worker access is declared. Continue protecting on-site access and accounts.'],
    Partial: ['moderate', 'Some remote access is declared. Apply MFA and secure remote-access controls.'],
    Yes: ['moderate', 'Remote access expands exposure. Require MFA, device protection, and secure remote-access controls.'],
  },
  external_exposure: {
    Low: ['good', 'Lower external exposure is a positive control signal; continue monitoring internet-facing assets.'],
    Medium: ['moderate', 'Moderate external exposure calls for regular patching, monitoring, and access review.'],
    High: ['risk', 'High external exposure increases attack surface. Prioritize MFA, patching, monitoring, and perimeter controls.'],
  },
  active_threat: {
    No: ['good', 'NO ACTIVE THREAT DETECTED. Baseline risk is still evaluated from exposure, vulnerabilities, assets, and controls.'],
    Yes: ['risk', 'ACTIVE SECURITY SIGNAL DETECTED. Prioritize investigation, containment, evidence preservation, and remediation.'],
  },
  threat_severity: {
    Low: ['good', 'Low-severity security signal. Continue monitoring and investigate the source.'],
    Medium: ['moderate', 'Medium-severity signal. Investigation and appropriate remediation are recommended.'],
    High: ['risk', 'High-severity signal. Prioritize investigation, containment, and remediation.'],
    Critical: ['risk', 'Critical security signal. Immediate investigation and containment should be prioritized.'],
  },
  asset_criticality: {
    Low: ['good', 'Lower business impact if compromised, but normal security controls should still be maintained.'],
    Medium: ['moderate', 'Moderate business impact. Apply appropriate protection and monitoring.'],
    High: ['risk', 'High-value asset. Strong authentication, monitoring, and protection are recommended.'],
    Critical: ['risk', 'Critical asset. Prioritize strong protection, monitoring, backup, and response readiness.'],
  },
}

function Feedback({ field, value }) {
  const feedback = FEEDBACK[field]?.[value]
  if (!feedback) return null
  const [tone, message] = feedback
  const colors = tone === 'good'
    ? { border: 'rgba(82,214,204,.35)', background: 'rgba(82,214,204,.08)', text: '#52d6cc', icon: '✓' }
    : tone === 'moderate'
      ? { border: 'rgba(244,183,104,.35)', background: 'rgba(244,183,104,.08)', text: '#f4b768', icon: '⚠' }
      : { border: 'rgba(248,121,120,.35)', background: 'rgba(248,121,120,.08)', text: '#f87978', icon: '⚠' }
  return <div role="status" style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', color: colors.text, background: colors.background, border: `1px solid ${colors.border}`, borderRadius: '5px', padding: '8px 10px', margin: '-7px 0 16px', fontSize: '11px', lineHeight: 1.45 }}><span aria-hidden="true" style={{ fontWeight: 700 }}>{colors.icon}</span><span>{message}</span></div>
}

function NumericFeedback({ field, value }) {
  if (value == null) return null
  const isPortals = field === 'web_portals'
  const isHigh = isPortals ? value >= 3 : value >= 10
  const isLow = value === 0 || (!isPortals && value <= 3)
  const feedback = isHigh
    ? ['risk', isPortals ? 'Higher public-portal exposure increases attack surface. Prioritize patching, WAF rules, monitoring, and strong authentication.' : 'A high number of internet-facing systems increases attack surface. Inventory, patch, monitor, and protect each exposed system.']
    : isLow
      ? ['good', isPortals ? 'No public portals are declared, which reduces this exposure category.' : 'Low internet-facing exposure is a positive signal; continue monitoring declared systems.']
      : ['moderate', isPortals ? 'Some public-portal exposure is declared. Review authentication, patching, and application monitoring.' : 'Some internet-facing systems are declared. Keep inventory, patching, monitoring, and access controls current.']
  return <FeedbackMessage tone={feedback[0]} message={feedback[1]} />
}

function FeedbackMessage({ tone, message }) {
  const colors = tone === 'good'
    ? { border: 'rgba(82,214,204,.35)', background: 'rgba(82,214,204,.08)', text: '#52d6cc', icon: '✓' }
    : tone === 'moderate'
      ? { border: 'rgba(244,183,104,.35)', background: 'rgba(244,183,104,.08)', text: '#f4b768', icon: '⚠' }
      : { border: 'rgba(248,121,120,.35)', background: 'rgba(248,121,120,.08)', text: '#f87978', icon: '⚠' }
  return <div role="status" style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', color: colors.text, background: colors.background, border: `1px solid ${colors.border}`, borderRadius: '5px', padding: '8px 10px', margin: '-7px 0 16px', fontSize: '11px', lineHeight: 1.45 }}><span aria-hidden="true" style={{ fontWeight: 700 }}>{colors.icon}</span><span>{message}</span></div>
}

function RadioGroup({ label: lbl, options, value, onChange, field }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ color: '#8290a4', fontSize: '11px', marginBottom: '8px' }}>{lbl}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
        {options.map(opt => (
          <button key={opt} type="button" style={radioGroup(value, opt)}
            onClick={() => onChange(opt)}>
            {value === opt && <Check size={11} />}
            {opt}
          </button>
        ))}
      </div>
      <Feedback field={field} value={value} />
    </div>
  )
}

function NumberInput({ label: lbl, value, onChange, min = 0, placeholder = '0', feedbackField = null }) {
  return (
    <label style={label}>
      {lbl}
      <input style={inp} type="number" min={min} value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      {feedbackField && <NumericFeedback field={feedbackField} value={value} />}
    </label>
  )
}

// ── STEPS ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'org',    title: 'Organization', icon: '🏢' },
  { id: 'infra',  title: 'Infrastructure', icon: '🌐' },
  { id: 'posture',title: 'Security Posture', icon: '🛡️' },
  { id: 'threat', title: 'Threat Context', icon: '⚠️' },
]

const INITIAL = {
  // Section A
  sector: 'IT',
  org_size: 'Medium',
  employee_count: null,
  critical_assets: null,
  security_budget_lakhs: null,
  // Section B
  internet_facing_systems: null,
  web_portals: null,
  critical_databases: null,
  cloud_usage: 'No',
  remote_workers: 'No',
  external_exposure: 'Medium',
  // Section C
  mfa: 'None',
  endpoint_protection: 'None',
  firewall_waf: 'None',
  backup: 'None',
  security_awareness: 'None',
  patching: 'Poor',
  incident_response: 'No',
  // Section D
  active_threat: 'No',
  threat_type: 'Other',
  affected_asset: 'Unknown',
  threat_severity: 'Medium',
  evidence_source: 'Manual Assessment',
  recent_incident: 'No',
  threat_likelihood: 'Medium',
  vulnerability_severity: 'Medium',
  asset_criticality: 'Medium',
}

function getPostureSummary(form) {
  const strong = [
    ['MFA', form.mfa === 'Full'],
    ['Endpoint protection', form.endpoint_protection === 'Advanced'],
    ['Firewall / WAF', form.firewall_waf === 'Advanced'],
    ['Daily backup', form.backup === 'Daily'],
    ['Patch management', form.patching === 'Good'],
    ['Security awareness', form.security_awareness === 'Regular'],
    ['Incident response', form.incident_response === 'Yes'],
  ].filter(([, isStrong]) => isStrong).map(([name]) => name)
  const weak = [
    ['MFA', form.mfa === 'None'],
    ['Endpoint protection', form.endpoint_protection === 'None'],
    ['Firewall / WAF', form.firewall_waf === 'None'],
    ['Backup', form.backup === 'None'],
    ['Patch management', form.patching === 'Poor'],
    ['Security awareness', form.security_awareness === 'None'],
    ['Incident response', form.incident_response === 'No'],
  ].filter(([, isWeak]) => isWeak).map(([name]) => name)
  const threat = form.active_threat === 'Yes'
  const posture = threat || weak.length >= 4 ? 'HIGH RISK' : weak.length >= 2 ? 'ELEVATED RISK' : strong.length >= 5 ? 'STRONG' : 'MODERATE'
  return { posture, strong, weak, threat }
}

// ── Section components ────────────────────────────────────────────────────────

function StepOrg({ form, set }) {
  return (
    <>
      <label style={label}>
        Sector / Industry
        <select style={sel} value={form.sector} onChange={e => set('sector', e.target.value)}>
          {['IT & Software', 'Healthcare', 'Banking & Finance', 'Manufacturing', 'Government / Public Sector', 'Retail', 'Telecommunications', 'Energy & Utilities', 'Other']
            .map(s => <option key={s}>{s}</option>)}
        </select>
      </label>
      <RadioGroup label="Organization size" name="org_size"
        options={['Small', 'Medium', 'Large']} value={form.org_size}
        onChange={v => set('org_size', v)} />
      <NumberInput label="Number of employees" name="employee_count"
        value={form.employee_count} onChange={v => set('employee_count', v)}
        placeholder="e.g. 25 (enter 0 if none yet)" />
      <NumberInput label="Number of critical digital assets" name="critical_assets"
        value={form.critical_assets} onChange={v => set('critical_assets', v)}
        placeholder="e.g. 5" />
      <label style={label}>
        Annual cybersecurity / IT security budget (₹ Lakhs)
        <input style={inp} type="number" min={0} step={0.5}
          value={form.security_budget_lakhs ?? ''} placeholder="e.g. 10"
          onChange={e => set('security_budget_lakhs', e.target.value === '' ? null : parseFloat(e.target.value))} />
      </label>
    </>
  )
}

function StepInfra({ form, set }) {
  return (
    <>
      <NumberInput label="Internet-facing systems (web servers, APIs, VPNs, etc.)"
        name="internet_facing_systems" value={form.internet_facing_systems}
        onChange={v => set('internet_facing_systems', v)} placeholder="e.g. 4" feedbackField="internet_facing_systems" />
      <NumberInput label="Public web portals / customer-facing applications"
        name="web_portals" value={form.web_portals}
        onChange={v => set('web_portals', v)} placeholder="e.g. 2" feedbackField="web_portals" />
      <NumberInput label="Critical databases (production, customer data, financial)"
        name="critical_databases" value={form.critical_databases}
        onChange={v => set('critical_databases', v)} placeholder="e.g. 3" />
      <RadioGroup label="Cloud usage" name="cloud_usage"
        options={['No', 'Partial', 'Yes']} value={form.cloud_usage}
        onChange={v => set('cloud_usage', v)} field="cloud_usage" />
      <RadioGroup label="Remote workers / work-from-home" name="remote_workers"
        options={['No', 'Partial', 'Yes']} value={form.remote_workers}
        onChange={v => set('remote_workers', v)} field="remote_workers" />
      <RadioGroup label="Overall external exposure level" name="external_exposure"
        options={['Low', 'Medium', 'High']} value={form.external_exposure}
        onChange={v => set('external_exposure', v)} field="external_exposure" />
    </>
  )
}

function StepPosture({ form, set }) {
  return (
    <>
      <RadioGroup label="Multi-Factor Authentication (MFA)" name="mfa"
        options={['None', 'Partial', 'Full']} value={form.mfa}
        onChange={v => set('mfa', v)} field="mfa" />
      <RadioGroup label="Endpoint protection (AV / EDR)" name="endpoint_protection"
        options={['None', 'Basic', 'Advanced']} value={form.endpoint_protection}
        onChange={v => set('endpoint_protection', v)} field="endpoint_protection" />
      <RadioGroup label="Firewall / Web Application Firewall (WAF)" name="firewall_waf"
        options={['None', 'Basic', 'Advanced']} value={form.firewall_waf}
        onChange={v => set('firewall_waf', v)} field="firewall_waf" />
      <RadioGroup label="Data backup frequency" name="backup"
        options={['None', 'Weekly', 'Daily']} value={form.backup}
        onChange={v => set('backup', v)} field="backup" />
      <RadioGroup label="Security awareness training" name="security_awareness"
        options={['None', 'Occasional', 'Regular']} value={form.security_awareness}
        onChange={v => set('security_awareness', v)} field="security_awareness" />
      <RadioGroup label="Vulnerability patching discipline" name="patching"
        options={['Poor', 'Moderate', 'Good']} value={form.patching}
        onChange={v => set('patching', v)} field="patching" />
      <RadioGroup label="Incident Response Plan (IRP)" name="incident_response"
        options={['No', 'Partial', 'Yes']} value={form.incident_response}
        onChange={v => set('incident_response', v)} field="incident_response" />
    </>
  )
}

function StepThreat({ form, set }) {
  return (
    <>
      <RadioGroup label="Active cyber threat detected?"
        options={['No', 'Yes']} value={form.active_threat}
        onChange={v => { set('active_threat', v); set('recent_incident', v) }} field="active_threat" />
      {form.active_threat === 'Yes' && (
        <>
          <RadioGroup label="Threat type" options={['Phishing', 'Suspicious Login', 'Malware', 'Ransomware', 'Vulnerability', 'Unauthorized Access', 'Other']} value={form.threat_type}
            onChange={v => set('threat_type', v)} />
          <RadioGroup label="Affected asset" options={['Website', 'Cloud Account', 'Database', 'Endpoint', 'Server', 'Unknown']} value={form.affected_asset}
            onChange={v => set('affected_asset', v)} />
          <RadioGroup label="Threat severity" options={['Low', 'Medium', 'High', 'Critical']} value={form.threat_severity}
            onChange={v => set('threat_severity', v)} field="threat_severity" />
          <RadioGroup label="Evidence / source" options={['Security Alert', 'Vulnerability Scan', 'CVE/Vulnerability Intelligence', 'User Report', 'Manual Assessment']} value={form.evidence_source}
            onChange={v => set('evidence_source', v)} />
        </>
      )}
      <RadioGroup label="Vulnerability severity of your known gaps"
        options={['Low', 'Medium', 'High']} value={form.vulnerability_severity}
        onChange={v => set('vulnerability_severity', v)} />
      <RadioGroup label="Criticality of your assets (business impact if compromised)"
        options={['Low', 'Medium', 'High', 'Critical']} value={form.asset_criticality}
        onChange={v => set('asset_criticality', v)} field="asset_criticality" />
    </>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div style={{ display: 'flex', gap: '0', marginBottom: '28px', overflowX: 'auto' }}>
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: '1 1 0', minWidth: '80px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', margin: '0 auto 6px',
                display: 'grid', placeItems: 'center', fontSize: '13px',
                background: done ? '#52d6cc' : active ? 'rgba(82,214,204,.2)' : '#1a2736',
                border: `2px solid ${done || active ? '#52d6cc' : '#263447'}`,
                color: done ? '#0c2429' : active ? '#52d6cc' : '#57687a',
              }}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <div style={{ fontSize: '9px', color: active ? '#f2f5f8' : done ? '#52d6cc' : '#57687a', fontWeight: active ? 700 : 400 }}>
                {s.title}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: '24px', height: '2px', background: done ? '#52d6cc' : '#263447', flexShrink: 0, marginBottom: '16px' }}></div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AssessmentPage({ onComplete, prefill = null }) {
  const { submit, loading, error } = useAssessment()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(prefill ?? INITIAL)
  const [submitError, setSubmitError] = useState('')
  const posture = getPostureSummary(form)

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  async function handleSubmit() {
    setSubmitError('')
    try {
      const resp = await submit(form)
      onComplete?.(resp)
    } catch (err) {
      setSubmitError(err.message)
    }
  }

  const stepComponents = [
    <StepOrg form={form} set={set} />,
    <StepInfra form={form} set={set} />,
    <StepPosture form={form} set={set} />,
    <StepThreat form={form} set={set} />,
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 70% 0%, #172438 0, #0c1119 40%)', padding: '32px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '7px', width: '31px', height: '31px', display: 'grid', placeItems: 'center' }}>
            <ShieldCheck size={17} />
          </div>
          <span style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '18px' }}>
            CyberRisk<span style={{ color: '#52d6cc' }}> AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <ClipboardList size={18} style={{ color: '#52d6cc' }} />
          <h1 style={{ color: '#f2f5f8', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, fontSize: '20px', margin: 0 }}>
            Cyber Risk Assessment
          </h1>
        </div>
        <p style={{ color: '#8290a4', fontSize: '12px', marginBottom: '24px', lineHeight: 1.6 }}>
          {prefill
            ? 'Update your assessment — your risk score will be recalculated.'
            : 'Complete this 4-step assessment to generate your organization\'s baseline cyber risk score. All fields feed directly into the risk calculation — no hidden defaults.'}
        </p>

        <Stepper current={step} />

        <div style={{ ...card, padding: '16px 18px', marginBottom: '13px', borderColor: posture.threat ? 'rgba(248,121,120,.45)' : '#2b4c4d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div>
              <div style={{ color: '#52d6cc', fontSize: '9px', fontWeight: 700, letterSpacing: '.8px' }}>LIVE ASSESSMENT FEEDBACK</div>
              <div style={{ color: '#f2f5f8', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>Security posture: {posture.posture}</div>
            </div>
            <ShieldCheck size={19} style={{ color: posture.threat || posture.weak.length >= 4 ? '#f87978' : '#52d6cc' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', color: '#8290a4', fontSize: '10px', lineHeight: 1.5 }}>
            <span><strong style={{ color: '#52d6cc' }}>Strong:</strong> {posture.strong.length ? posture.strong.join(', ') : 'None selected yet'}</span>
            <span><strong style={{ color: '#f87978' }}>Needs improvement:</strong> {posture.weak.length ? posture.weak.join(', ') : 'None identified'}</span>
          </div>
          {posture.threat && <div style={{ color: '#f87978', fontSize: '10px', marginTop: '8px', fontWeight: 700 }}>ACTIVE SECURITY SIGNAL DETECTED</div>}
          <div style={{ color: '#57687a', fontSize: '9px', marginTop: '8px' }}>This is live form feedback, not the final calculated cyber-risk score.</div>
        </div>

        {/* Step card */}
        <div style={card}>
          <h2 style={{ color: '#f2f5f8', fontSize: '14px', fontWeight: 700, marginBottom: '20px', fontFamily: '"Space Grotesk",sans-serif' }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </h2>

          {(submitError || error) && (
            <div style={errBox}>{submitError || error}</div>
          )}

          {stepComponents[step]}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '18px', borderTop: '1px solid #263142' }}>
            <button type="button"
              style={{ background: 'none', border: '1px solid #263447', color: '#8290a4', borderRadius: '6px', padding: '9px 18px', cursor: step === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: step === 0 ? 0.4 : 1, fontFamily: 'inherit' }}
              disabled={step === 0}
              onClick={() => setStep(s => s - 1)}>
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button type="button"
                style={{ background: '#52d6cc', border: 0, color: '#0c2429', borderRadius: '6px', padding: '9px 22px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
                onClick={() => setStep(s => s + 1)}>
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" disabled={loading}
                style={{ background: loading ? '#3a9e98' : '#52d6cc', border: 0, color: '#0c2429', borderRadius: '6px', padding: '9px 22px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit' }}
                onClick={handleSubmit}>
                {loading ? 'Calculating…' : 'Calculate Risk Score'}
              </button>
            )}
          </div>
        </div>

        <p style={{ color: '#3d4f61', fontSize: '10px', textAlign: 'center', marginTop: '16px' }}>
        </p>
      </div>
    </div>
  )
}
