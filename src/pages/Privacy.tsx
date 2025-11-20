import { Link } from "react-router-dom";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Privacy Policy - unifr | Data Protection & Privacy"
        description="Read unifr's Privacy Policy. Learn how we collect, use, and protect your data when you use our AI visibility tracking platform. Your privacy is important to us."
        keywords="unifr privacy policy, data protection, privacy, GDPR, data security, AI tracking privacy"
        canonical="https://unifr.ai/privacy"
      />
      <HomeHeader />
      <div className="pt-32 pb-24 px-3 lg:px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                At unifr ("we," "our," or "us"), your privacy matters. This Privacy Policy explains how we collect, use, store, 
                and protect your information when you use our AI visibility tracking and analytics platform ("Service"). By accessing 
                unifr, you agree to the practices outlined below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Account Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Email address</li>
                <li>Encrypted password</li>
                <li>Name and company details (optional)</li>
                <li>Billing information (processed securely through Razorpay, our payment gateway provider)</li>
                <li>Payment card details are handled exclusively by Razorpay and are never stored on our servers</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Brand & Project Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To deliver our Service, we collect:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Brand names, keywords, and topics you choose to track</li>
                <li>Competitor names you add for comparison</li>
                <li>Scan settings and custom configurations</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Usage & Technical Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Automatically collected:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Scan history and analytics</li>
                <li>Dashboard interactions</li>
                <li>IP address, browser type, OS, and device type</li>
                <li>Error logs and diagnostic data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use your data to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide and maintain the Service</li>
                <li>Generate visibility insights and AI perception reports</li>
                <li>Process payments and send invoices</li>
                <li>Deliver security alerts, updates, and administrative messages</li>
                <li>Improve platform reliability and performance</li>
                <li>Detect and prevent fraud or misuse</li>
                <li>Send marketing emails (you may opt out anytime)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Share Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We never sell your personal data.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We only share information in these cases:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Payment Processors:</strong> We use Razorpay for payment processing. Razorpay collects and processes your payment information according to their privacy policy. We do not store your full payment card details.</li>
                <li><strong>Service Providers:</strong> Hosting (Supabase), analytics, email systems, and other service providers necessary to operate the platform</li>
                <li><strong>AI Providers:</strong> When you run scans, relevant text queries may be sent to OpenAI, Google Gemini, Anthropic Claude, DeepSeek, etc. These providers process queries according to their own privacy policies.</li>
                <li><strong>Legal Requirements:</strong> When required to comply with laws, court orders, or protect our rights and safety</li>
                <li><strong>Business Events:</strong> Mergers, acquisitions, or asset transfers (with notice to users)</li>
                <li><strong>With Your Permission:</strong> When you explicitly authorize sharing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement strong administrative, technical, and physical safeguards to protect your data:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Encryption in transit (HTTPS/TLS) and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and monitoring</li>
                <li>Payment data is processed through PCI-DSS compliant Razorpay infrastructure</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                While we work to secure your data, no system is perfectly secure — we cannot guarantee absolute protection. 
                We recommend using strong passwords and enabling two-factor authentication when available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We keep your information:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>As long as your account is active</li>
                <li>As required to operate or improve the Service</li>
                <li>As necessary to meet legal or accounting obligations</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                You may request deletion of your account at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Depending on your region, you may have rights to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your data</li>
                <li>Export your data</li>
                <li>Opt out of marketing</li>
                <li>Update your account information</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                You can exercise most rights directly from your account dashboard or by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance functionality.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can disable cookies in your browser, but some features may not work as intended.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                unifr is not intended for individuals under 18.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not knowingly collect data from minors. Contact us if you believe a minor has submitted personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Transfers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your data may be processed in countries with different privacy laws.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We apply appropriate safeguards to ensure your data remains protected.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy periodically.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                If significant changes occur, we will notify users within the platform or by email.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                The "Last updated" date will always reflect the latest version.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions about this Privacy Policy or data practices, contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <a href="mailto:hertofhelp@gmail.com" className="text-gray-900 underline hover:text-gray-700">
                  📧 hertofhelp@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default Privacy;

