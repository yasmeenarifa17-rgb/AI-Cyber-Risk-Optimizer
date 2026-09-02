export const assets = [
  { id: 'payment', name: 'Payment Server', type: 'Production service', vulnerability: 'Remote Code Execution', cvss: 9.8, probability: 0.72, criticality: 'Critical', impact: 50, exposure: 'Internet-facing', owner: 'FinOps', recommendation: 'Patch vulnerable software and apply emergency remediation' },
  { id: 'portal', name: 'Employee Portal', type: 'Web application', vulnerability: 'Phishing Exposure', cvss: 7.5, probability: 0.55, criticality: 'High', impact: 25, exposure: 'Public access', owner: 'People Ops', recommendation: 'Security awareness and email protection' },
  { id: 'database', name: 'Customer Database', type: 'Cloud database', vulnerability: 'Weak Access Control', cvss: 8.8, probability: 0.6, criticality: 'Critical', impact: 45, exposure: 'Restricted network', owner: 'Data team', recommendation: 'Strengthen access control and MFA' },
  { id: 'iot', name: 'IoT Gateway', type: 'Infrastructure', vulnerability: 'Outdated Firmware', cvss: 7.2, probability: 0.4, criticality: 'Medium', impact: 15, exposure: 'Internal network', owner: 'IT Operations', recommendation: 'Upgrade firmware and isolate the network' },
]

export const recommendations = [
  { id: 'patch', action: 'Patch vulnerable software and apply emergency remediation', related: 'Payment Server', vulnerability: 'Remote Code Execution', cost: 8, reduction: 25, priority: 'Critical', reason: 'A critical internet-facing service has the highest combined severity, probability, and business impact.' },
  { id: 'access', action: 'Strengthen access control and MFA', related: 'Customer Database', vulnerability: 'Weak Access Control', cost: 6, reduction: 18, priority: 'High', reason: 'Tighter permissions reduce the blast radius of a compromised identity or service account.' },
  { id: 'mfa', action: 'Security awareness and email protection', related: 'Employee Portal', vulnerability: 'Phishing Exposure', cost: 3, reduction: 12, priority: 'Medium', reason: 'MFA and targeted awareness reduce the likelihood of phishing-led account takeover.' },
  { id: 'segment', action: 'Firmware upgrade and network isolation', related: 'IoT Gateway', vulnerability: 'Outdated Firmware', cost: 2, reduction: 10, priority: 'Medium', reason: 'Segmentation limits lateral movement from older devices and unmanaged networks.' },
]

export const organizationSummary = {
  baselineRisk: 78,
  criticalVulnerabilities: 7,
  vulnerableAssets: 12,
  availableBudget: 20,
}
