import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowRight, Bot, CheckCircle2, Link2, MessageSquareText, Phone, Send,
  ShieldCheck, ShieldAlert, Upload, Zap,
} from 'lucide-react'
import { sendCitizenChat } from '../api/client'
import { ensureAnonymousCitizen, firebaseConfigured, recordCitizenScan, watchCitizenScans } from '../firebase'

const tabButton = (active) => ({
  flex: '1', minWidth: 0, border: '1px solid #263447', borderRadius: '8px',
  padding: '8px 10px', background: active ? 'rgba(82,214,204,.12)' : '#17202d',
  color: active ? '#dffaf7' : '#9aa9ba', fontSize: '10px', fontWeight: 700,
  letterSpacing: '.3px', textTransform: 'uppercase', cursor: 'pointer',
})

const riskTone = {
  'LOW CONCERN': '#52d6cc',
  'SUSPICIOUS': '#f4b768',
  'HIGH RISK': '#f87978',
}

function classifyMessage(message = '') {
  const text = message.toLowerCase()
  const indicators = []
  let score = 0

  if (/urgent|immediately|today only|act now|expires|final warning/i.test(text)) { indicators.push('Urgency'); score += 18 }
  if (/click|tap here|open link|visit .*link|bit\.ly|shorturl|\.tk|\.ml|\.ga|redirect/i.test(text)) { indicators.push('Suspicious link'); score += 20 }
  if (/otp|one time password|verify code|code sent|bank code|login code/i.test(text)) { indicators.push('Request for OTP'); score += 25 }
  if (/payment|upi|bank transfer|pay now|send money|refund|wallet|invoice/i.test(text)) { indicators.push('Request for payment'); score += 18 }
  if (/password|username|login|credential|email id|account details/i.test(text)) { indicators.push('Credential request'); score += 22 }
  if (/bank|icici|hdfc|sbi|paytm|amazon|delivery|job offer|government|police|courier/i.test(text)) { indicators.push('Impersonation indicators'); score += 12 }
  if (/unknown sender|new number|from unknown|not in contacts|not recognized/i.test(text)) { indicators.push('Unknown sender'); score += 10 }
  if (/\.in\b|\.com\b|\.co\b|\.click|verify(?:-)?account|secure.*login|update.*details/i.test(text)) { indicators.push('Suspicious domain'); score += 16 }
  if (indicators.length === 0) { indicators.push('Other detected indicators') }

  if (score >= 55) return { level: 'HIGH RISK', color: '#f87978', indicators, summary: 'Potential phishing indicators detected.' }
  if (score >= 25) return { level: 'SUSPICIOUS', color: '#f4b768', indicators, summary: 'This message contains characteristics commonly associated with scams.' }
  return { level: 'LOW CONCERN', color: '#52d6cc', indicators: ['No strong scam pattern detected'], summary: 'No obvious scam indicators were detected from this message.' }
}

function analyzeUrl(value = '') {
  const raw = (value || '').trim()
  if (!raw) {
    return { label: 'No URL provided', summary: 'Paste a URL to check for obvious suspicious patterns.', indicators: [], risk: 'LOW CONCERN' }
  }

  const lower = raw.toLowerCase()
  const suspicious = []
  if (!/^https?:\/\//i.test(raw)) suspicious.push('URL should include a protocol such as https://')
  if (/bit\.ly|tinyurl|goo\.gl|t\.co|shorturl|redirect|paypal-secure|verify-login|secure-update/i.test(lower)) suspicious.push('Shortened or suspicious redirect links detected')
  if (/(\.tk|\.ml|\.ga|\.xyz|free.*gift|claim.*prize|urgent.*reward)/i.test(lower)) suspicious.push('Unusual or deceptive domain pattern')
  if (/login|verify|update.*account|bank.*password|otp/i.test(lower)) suspicious.push('Link appears designed to collect credentials or OTP codes')

  if (suspicious.length) {
    return { label: 'Potentially suspicious indicators', summary: 'The URL includes patterns commonly used in scam or phishing attempts. Use this as guidance, not a guarantee.', indicators: suspicious.slice(0, 4), risk: 'SUSPICIOUS' }
  }

  return { label: 'No obvious indicators detected from this analysis', summary: 'This look-up did not reveal obvious suspicious patterns, but it is not a guarantee that the site is safe.', indicators: ['Domain looks normal at a glance'], risk: 'LOW CONCERN' }
}

function scanMessageContent(rawText, fileName) {
  const text = `${rawText || ''} ${fileName || ''}`.trim()
  if (!text) return { level: 'LOW CONCERN', color: '#52d6cc', summary: 'Add a message or upload a screenshot to analyze it.', indicators: ['No content to review'], recommendations: ['Paste the suspicious message or upload a screenshot.'] }
  const result = classifyMessage(text)
  const recommendations = [
    'Do not click any link in the message.',
    'Do not share OTP, password, or banking details.',
    'Verify the sender using an official app or channel.',
    'Report or block the message if it appears fraudulent.',
  ]

  return {
    ...result,
    recommendations,
  }
}

function MarkdownBubble({ content }) {
  return (
    <div style={{ fontSize: '12px', lineHeight: 1.7, color: '#dfeaf7' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: '0 0 10px 18px', padding: 0 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: '0 0 10px 18px', padding: 0 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        strong: ({ children }) => <strong style={{ color: '#f2f5f8', fontWeight: 700 }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: '#bfe7ff' }}>{children}</em>,
        code: ({ children, className }) => (
          <code className={className} style={{ background: '#0f1724', border: '1px solid #2b3d4d', borderRadius: '4px', padding: '1px 5px', fontSize: '11px' }}>
            {children}
          </code>
        ),
        pre: ({ children }) => <pre style={{ background: '#0f1724', border: '1px solid #2b3d4d', borderRadius: '6px', padding: '10px', overflowX: 'auto', margin: '8px 0' }}>{children}</pre>,
      }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

const mobileChecklist = [
  { title: 'Enable screen lock and biometrics', explanation: 'Locks the phone if it is lost or left unattended.', importance: 'High', action: 'Turn on face or fingerprint unlock in Settings.' },
  { title: 'Turn on MFA for key accounts', explanation: 'Prevents stolen passwords from being enough to access important accounts.', importance: 'High', action: 'Enable MFA on email, banking, and social accounts.' },
  { title: 'Keep Android/iOS updated', explanation: 'Security updates fix critical vulnerabilities that attackers may exploit.', importance: 'High', action: 'Install software updates when prompted.' },
  { title: 'Update apps regularly', explanation: 'App updates often patch known security and privacy issues.', importance: 'Medium', action: 'Review the app store for pending updates.' },
  { title: 'Review app permissions', explanation: 'Unneeded permissions can expose personal data or allow misuse.', importance: 'Medium', action: 'Remove access for unused or suspicious apps.' },
  { title: 'Only install from trusted stores', explanation: 'Unknown sources increase risk of malware and harmful apps.', importance: 'High', action: 'Avoid installing APKs outside the official store.' },
  { title: 'Beware of suspicious links', explanation: 'Scam text messages and fake links often lead to credential theft.', importance: 'High', action: 'Do not click links from unexpected SMS or WhatsApp chats.' },
  { title: 'Review browser and site permissions', explanation: 'Websites can request unnecessary access to notifications or location.', importance: 'Medium', action: 'Limit location, camera, and notification access.' },
  { title: 'Enable device finding features', explanation: 'Lets you locate or wipe your phone if it is lost or stolen.', importance: 'Medium', action: 'Turn on Find My Phone / Find My iPhone.' },
  { title: 'Back up important data', explanation: 'Backups help you recover quickly from ransomware or device loss.', importance: 'Medium', action: 'Back up photos, contacts, and important files.' },
  { title: 'Review account login activity', explanation: 'Unexpected sign-ins may indicate a breach or stolen credentials.', importance: 'High', action: 'Check recent account activity and revoke unknown sessions.' },
  { title: 'Use a reputable password manager', explanation: 'Helps you use unique strong passwords without reusing them across sites.', importance: 'Medium', action: 'Create a strong vault and keep recovery methods updated.' },
]

export default function CitizenPortal({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [messageText, setMessageText] = useState('')
  const [fileName, setFileName] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkResult, setLinkResult] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help you spot scam messages, explain the risks, and suggest safe next steps. Ask me about a message, a link, or account compromise.' },
  ])
  const [chatLoading, setChatLoading] = useState(false)
  const [citizenUser, setCitizenUser] = useState(null)
  const [scanCount, setScanCount] = useState(0)
  const [firebaseError, setFirebaseError] = useState('')

  useEffect(() => {
    let unsubscribe = () => {}
    if (!firebaseConfigured) {
      setFirebaseError('Firebase is not configured, so scan usage cannot be persisted yet.')
      return () => unsubscribe()
    }
    ensureAnonymousCitizen()
      .then(user => {
        setCitizenUser(user)
        unsubscribe = watchCitizenScans(user.uid, setScanCount, () => setFirebaseError('Unable to load scan usage.'))
      })
      .catch(() => setFirebaseError('Unable to start the citizen session.'))
    return () => unsubscribe()
  }, [])

  async function handleCitizenChatSend() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatMessages(current => [...current, { role: 'user', text }])
    setChatInput('')
    setChatLoading(true)

    try {
      const response = await sendCitizenChat(text, chatMessages.map(item => ({ role: item.role, content: item.text })))
      setChatMessages(current => [...current, { role: 'assistant', text: response.reply || response.response || 'I am not able to answer that question right now.' }])
    } catch (error) {
      setChatMessages(current => [...current, { role: 'assistant', text: `I’m temporarily unavailable. Please try again in a moment. Error: ${error.message || 'Unknown issue'}` }])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleAnalyzeMessage() {
    setScanLoading(true)
    try {
      const result = scanMessageContent(messageText, fileName)
      setScanResult(result)
      setActiveTab('scan')
      if (citizenUser && (messageText.trim() || fileName)) await recordCitizenScan(citizenUser.uid, result.level)
    } catch {
      setFirebaseError('The scan completed, but its usage metadata could not be saved.')
    } finally {
      setScanLoading(false)
    }
  }

  function handleLinkCheck() {
    setLinkResult(analyzeUrl(linkUrl))
  }

  const resultHeader = scanResult && (
    <div style={{ background: 'rgba(15,23,36,.8)', border: '1px solid #2d4258', borderRadius: '10px', padding: '18px 18px 12px', marginTop: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <ShieldAlert size={18} style={{ color: scanResult.color }} />
        <div>
          <div style={{ color: '#cde3f0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '3px' }}>CyberRisk AI Analysis</div>
          <h3 style={{ margin: 0, color: '#f3f8fc', fontSize: '24px', fontWeight: 700 }}>Risk Level: <span style={{ color: scanResult.color }}>{scanResult.level}</span></h3>
        </div>
      </div>
      <div style={{ color: '#c8d8e5', fontSize: '13px', marginBottom: '14px' }}>{scanResult.summary}</div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ color: '#7f919e', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '8px' }}>Potential Indicators:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {scanResult.indicators.map(item => (
            <span key={item} style={{ border: '1px solid #2d4258', background: 'rgba(92,112,136,.12)', color: '#d5e6f2', borderRadius: '999px', padding: '4px 8px', fontSize: '10px' }}>{item}</span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: '18px' }}>
        <div style={{ color: '#7f919e', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '8px' }}>Recommended Actions:</div>
        <ol style={{ margin: 0, paddingLeft: '18px', color: '#dbedf6', fontSize: '12px', lineHeight: 1.8 }}>
          {scanResult.recommendations.map(item => <li key={item}>{item}</li>)}
        </ol>
      </div>
      <button type="button" style={{ marginTop: '18px', background: '#52d6cc', border: 0, borderRadius: '6px', color: '#0d2a30', padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setChatInput(`Explain this scan result and what I should do next. Risk level: ${scanResult.level}. Indicators: ${scanResult.indicators.join(', ')}.`); setActiveTab('assistant') }}>
        Ask CyberRisk AI about this result
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 75% 0%, #172438 0, #0c1119 38%)', padding: '26px 18px 40px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#52d6cc', color: '#0c2429', borderRadius: '8px', width: '32px', height: '32px', display: 'grid', placeItems: 'center' }}><ShieldCheck size={17} /></div>
            <div>
              <div style={{ color: '#f2f5f8', fontSize: '18px', fontWeight: 700, letterSpacing: '-.3px' }}>CyberRisk <span style={{ color: '#52d6cc' }}>AI</span></div>
              <div style={{ color: '#95a5b9', fontSize: '10px', letterSpacing: '.6px', textTransform: 'uppercase' }}>Citizen Cyber Safety</div>
            </div>
          </div>
          <div style={{ color: '#8ca0b8', fontSize: '12px' }}>Check before you click. Protect before your data is exposed.</div>
        </header>
        <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px', border: '1px solid #394d66', background: '#101b29', color: '#dfeaf7', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer' }}>
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Portal Selection
        </button>
        {firebaseError && <div style={{ marginBottom: '16px', padding: '10px 12px', border: '1px solid rgba(244,183,104,.35)', borderRadius: '6px', color: '#f4b768', fontSize: '11px' }}>{firebaseError}</div>}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
          {['dashboard', 'scan', 'link', 'assistant', 'mobile', 'recommendations'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={tabButton(activeTab === tab)}>
              {tab === 'dashboard' ? 'Security Dashboard' : tab === 'scan' ? 'Scan Message' : tab === 'link' ? 'Check Link' : tab === 'assistant' ? 'AI Assistant' : tab === 'mobile' ? 'Mobile Safety' : 'Recommendations'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {[
                { label: 'Scans Performed', value: scanCount, detail: scanCount ? 'Saved scan metadata' : 'No scans yet.', color: '#79aaf6' },
                { label: 'Recent Activity', value: scanCount ? `${scanCount} scan${scanCount === 1 ? '' : 's'}` : 'No activity yet.', detail: 'Based on your completed scans', color: '#52d6cc' },
              ].map(card => (
                <div key={card.label} style={{ border: '1px solid #263142', borderRadius: '10px', background: 'rgba(21,29,41,.8)', padding: '18px 18px 14px' }}>
                  <div style={{ color: '#8698ac', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '14px' }}>{card.label}</div>
                  <div style={{ color: '#f2f5f8', fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>{card.value}</div>
                  <div style={{ color: card.color, fontSize: '11px' }}>{card.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '10px', padding: '18px', marginBottom: '16px', color: '#a9bacd', fontSize: '12px' }}>
              {scanCount ? 'Your completed safety scans will appear here.' : 'No scans yet. Your completed safety scans will appear here.'}
            </div>
          </>
        )}

        {activeTab === 'scan' && (
          <section style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <MessageSquareText size={18} style={{ color: '#52d6cc' }} />
              <h2 style={{ margin: 0, color: '#f2f5f8', fontSize: '18px' }}>Scan a Suspicious Message</h2>
            </div>

            <div style={{ background: 'rgba(82,214,204,.05)', border: '1px solid rgba(82,214,204,.25)', borderRadius: '8px', padding: '12px 14px', color: '#cfeaf6', fontSize: '11px', marginBottom: '18px' }}>
              <strong style={{ display: 'block', marginBottom: '5px', color: '#52d6cc' }}>Privacy Notice</strong>
              Only the uploaded content required for analysis is processed. Avoid uploading passwords, OTPs, payment credentials, Aadhaar numbers, bank account numbers or other highly sensitive information.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#a9bacd', fontSize: '11px', marginBottom: '8px' }}>Paste suspicious message here</label>
                <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={8} style={{ width: '100%', borderRadius: '8px', border: '1px solid #2d3d50', background: '#17202d', color: '#f2f5f8', padding: '12px 14px', resize: 'vertical', fontSize: '12px' }} placeholder="e.g. Your bank account will be blocked today. Click here to verify immediately." />
              </div>
              <div>
                <label style={{ display: 'block', color: '#a9bacd', fontSize: '11px', marginBottom: '8px' }}>Upload screenshot</label>
                <label style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', border: '1px dashed #3b536e', background: '#121c29', borderRadius: '8px', minHeight: '170px', color: '#a2b7c8', textAlign: 'center', cursor: 'pointer', padding: '18px 12px' }}>
                  <Upload size={22} style={{ color: '#52d6cc' }} />
                  <div>
                    <strong style={{ display: 'block', color: '#f2f5f8', fontSize: '12px' }}>Upload Screenshot</strong>
                    <span style={{ fontSize: '10px', color: '#91a3b7' }}>{fileName || 'PNG, JPG, or GIF'}</span>
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
                </label>
              </div>
            </div>

            <button type="button" onClick={handleAnalyzeMessage} disabled={scanLoading || (!messageText.trim() && !fileName)} style={{ marginTop: '18px', background: '#52d6cc', border: 0, borderRadius: '6px', padding: '10px 14px', color: '#0d2a30', fontWeight: 700, cursor: (scanLoading || (!messageText.trim() && !fileName)) ? 'not-allowed' : 'pointer', opacity: (scanLoading || (!messageText.trim() && !fileName)) ? 0.7 : 1 }}>
              {scanLoading ? 'Analyzing with CyberRisk AI…' : 'Analyze with CyberRisk AI'}
            </button>

            {resultHeader}
          </section>
        )}

        {activeTab === 'link' && (
          <section style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Link2 size={18} style={{ color: '#52d6cc' }} />
              <h2 style={{ margin: 0, color: '#f2f5f8', fontSize: '18px' }}>Check Suspicious Website / Link</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" style={{ flex: '1', minWidth: '220px', background: '#17202d', border: '1px solid #2d3d50', borderRadius: '6px', padding: '11px 12px', color: '#f2f5f8', fontSize: '12px' }} />
              <button type="button" onClick={handleLinkCheck} style={{ background: '#52d6cc', border: 0, borderRadius: '6px', color: '#0d2a30', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}>Check Link</button>
            </div>

            {linkResult && (
              <div style={{ marginTop: '18px', background: 'rgba(15,23,36,.8)', border: '1px solid #2d4258', borderRadius: '10px', padding: '18px' }}>
                <div style={{ color: '#7e8da1', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '8px' }}>Website Review</div>
                <h3 style={{ margin: '0 0 8px', color: '#f2f5f8', fontSize: '22px' }}>{linkResult.label}</h3>
                <div style={{ color: '#d7e5f3', lineHeight: 1.7, fontSize: '12px', marginBottom: '12px' }}>{linkResult.summary}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {linkResult.indicators.map(item => <span key={item} style={{ borderRadius: '999px', background: 'rgba(109,128,147,.1)', border: '1px solid #2d4258', color: '#dfeaf7', padding: '5px 8px', fontSize: '10px' }}>{item}</span>)}
                </div>
                <div style={{ color: riskTone[linkResult.risk] || '#52d6cc', fontWeight: 700, fontSize: '12px' }}>Risk Assessment: {linkResult.risk}</div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'assistant' && (
          <section style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Bot size={18} style={{ color: '#52d6cc' }} />
              <h2 style={{ margin: 0, color: '#f2f5f8', fontSize: '18px' }}>AI Cybersecurity Assistant</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', padding: '0 4px 8px' }}>
              {chatMessages.map((message) => (
                <div key={`${message.role}-${message.text}`} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: message.role === 'user' ? '#1d3750' : '#1a2736', border: `1px solid ${message.role === 'user' ? '#2d5d72' : '#263142'}`, borderRadius: message.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: '10px 12px' }}>
                  {message.role === 'assistant' ? <div style={{ color: '#52d6cc', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '4px' }}>CyberRisk AI</div> : null}
                  <MarkdownBubble content={message.text} />
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '8px 12px', color: '#52d6cc', fontSize: '11px', border: '1px solid #2d3d50', borderRadius: '8px', background: '#17202d' }}>CyberRisk AI is thinking…</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <textarea rows={3} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about a suspicious message, link, or phone security setting" style={{ flex: 1, background: '#17202d', border: '1px solid #2d3d50', borderRadius: '8px', padding: '10px 12px', color: '#f2f5f8', fontSize: '12px', resize: 'vertical' }} />
              <button type="button" onClick={handleCitizenChatSend} disabled={chatLoading || !chatInput.trim()} style={{ background: '#52d6cc', border: 0, borderRadius: '8px', padding: '0 14px', color: '#0c2429', fontWeight: 700, cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer' }}>
                <Send size={16} />
              </button>
            </div>
          </section>
        )}

        {activeTab === 'mobile' && (
          <section style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Phone size={18} style={{ color: '#52d6cc' }} />
              <h2 style={{ margin: 0, color: '#f2f5f8', fontSize: '18px' }}>Protect Your Phone Before Your Data Is Exposed</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              {mobileChecklist.map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '12px', border: '1px solid #263142', background: '#162231', borderRadius: '10px', padding: '14px 12px' }}>
                  <div style={{ color: '#52d6cc', marginTop: '2px' }}><CheckCircle2 size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f2f5f8', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>{item.title}</div>
                    <div style={{ color: '#8ea2b8', fontSize: '10px', lineHeight: 1.6 }}>{item.explanation}</div>
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                      <span style={{ color: item.importance === 'High' ? '#f87978' : '#f4b768', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>{item.importance} priority</span>
                      <span style={{ color: '#dfeaf7', fontSize: '10px' }}>{item.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'recommendations' && (
          <section style={{ border: '1px solid #263142', background: 'rgba(21,29,41,.8)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Zap size={18} style={{ color: '#52d6cc' }} />
              <h2 style={{ margin: 0, color: '#f2f5f8', fontSize: '18px' }}>Top Citizen Safety Actions</h2>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {[
                { heading: 'Verify urgent requests', detail: 'If an SMS or message says your account is blocked, call the official number or use the app directly.' },
                { heading: 'Protect account access', detail: 'Enable MFA and never share OTPs, passwords, or card details with a surprise message.' },
                { heading: 'Check before you click', detail: 'Avoid shortened links, unknown domains, and suspicious attachments.' },
                { heading: 'Report and block', detail: 'Use report or block features on SMS, WhatsApp, email, and social networks to reduce repeat attempts.' },
              ].map(item => (
                <div key={item.heading} style={{ border: '1px solid #263142', borderRadius: '8px', background: '#182333', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px' }}>
                  <ArrowRight size={14} style={{ color: '#52d6cc', marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#f2f5f8', display: 'block', marginBottom: '4px', fontSize: '12px' }}>{item.heading}</strong>
                    <span style={{ color: '#8ea2b8', fontSize: '11px', lineHeight: 1.6 }}>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ marginTop: '20px', padding: '14px 14px 0', color: '#7d8ea4', fontSize: '10px' }}>
          AI-powered scam and phishing analysis. Use the result as guidance, not as a guarantee.
        </div>
      </div>
    </div>
  )
}
