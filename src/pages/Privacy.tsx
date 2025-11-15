import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";

const Privacy = () => {
  return (
    <div className="bg-white min-h-screen">
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
                At unifr ("we," "our," or "us"), we are committed to protecting your privacy. This Privacy Policy explains how 
                we collect, use, disclose, and safeguard your information when you use our AI visibility tracking service 
                ("Service"). Please read this policy carefully to understand our practices regarding your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Account Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                When you create an account, we collect:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Name and company information (if provided)</li>
                <li>Billing information (processed securely through payment processors)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Brand Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To provide our Service, we collect:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Brand names and related keywords you want to track</li>
                <li>Competitor information for comparison analysis</li>
                <li>Scan configurations and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Usage Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We automatically collect information about how you use the Service:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Scan history and results</li>
                <li>Dashboard interactions and feature usage</li>
                <li>IP address and browser information</li>
                <li>Device information and operating system</li>
                <li>Log data and error reports</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the collected information to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues</li>
                <li>Send marketing communications (with your consent, which you can opt out of)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Share Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (e.g., 
                payment processing, cloud hosting, analytics)</li>
                <li><strong>AI Providers:</strong> When you request scans, we send queries to AI providers (OpenAI, Google, 
                etc.) as necessary to provide the Service. These providers have their own privacy policies.</li>
                <li><strong>Legal Requirements:</strong> If required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet 
                or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your information for as long as your account is active or as needed to provide the Service. We may 
                retain certain information for longer periods as required by law or for legitimate business purposes. You can 
                request deletion of your account and data at any time through your account settings or by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Account Settings:</strong> Update your account information and preferences at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you 
                do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information 
                from children. If you become aware that a child has provided us with personal information, please contact us, 
                and we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These 
                countries may have data protection laws that differ from those in your country. We take appropriate safeguards to 
                ensure your information receives adequate protection.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy 
                Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy 
                periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us at{" "}
                <a href="/contact" className="text-gray-900 underline hover:text-gray-700">our contact page</a>.
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

