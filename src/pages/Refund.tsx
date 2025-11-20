import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";
import { SEO } from "@/components/SEO";

const Refund = () => {
  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Refund Policy - unifr | 30-Day Money-Back Guarantee"
        description="Learn about unifr's refund policy. We offer a 30-day money-back guarantee for new subscribers. Understand our refund eligibility, processing, and cancellation policies."
        keywords="unifr refund policy, money back guarantee, refund, cancellation policy, subscription refund"
        canonical="https://unifr.ai/refund"
      />
      <HomeHeader />
      <div className="pt-32 pb-24 px-3 lg:px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">
            Refund Policy
          </h1>
          <p className="text-sm text-gray-500 mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                At unifr, we want you to feel confident using our AI visibility tracking and analytics platform. This Refund Policy 
                outlines when refunds may be issued for subscription fees and how refund requests are handled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Refund Eligibility</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We provide refunds under the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">30-Day Money-Back Guarantee</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                New subscribers may request a full refund within 30 days of their initial subscription date if they are not satisfied 
                with the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Service Interruption</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If the Service is unavailable for more than 48 consecutive hours due to an issue on our side, you may be eligible 
                for a prorated refund for the affected period.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Billing Errors</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are incorrectly charged due to our error, we will refund the overcharged amount in full.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Non-Refundable Items</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Refunds will not be issued for:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Subscriptions canceled after the 30-day guarantee period</li>
                <li>Usage-based charges already consumed (e.g., AI scans completed)</li>
                <li>Enterprise plans with custom contractual terms</li>
                <li>Refund requests based on changes in AI model behavior or visibility scores
                  <span className="block ml-4 mt-1 text-sm text-gray-600">
                    (These results depend on external AI providers and are outside our control)
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How to Request a Refund</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To request a refund:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Contact us at <a href="mailto:hertofhelp@gmail.com" className="text-gray-900 underline hover:text-gray-700">hertofhelp@gmail.com</a></li>
                <li>Include your account email and subscription details</li>
                <li>Provide a brief explanation for your refund request</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                Our team will review your request within 5–7 business days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Refund Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If your refund is approved:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>We will process the refund to your original payment method</li>
                <li>Processing typically takes 7–10 business days</li>
                <li>Your payment provider may take additional time to credit the funds</li>
                <li>You will receive an email confirmation once your refund has been issued.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Subscription Cancellation</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may cancel your subscription at any time through your account settings.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cancellation takes effect at the end of your current billing cycle.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Access to the Service continues until your paid period expires.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Refunds are not issued for unused time remaining in a billing cycle unless you are within the 30-day guarantee window.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Chargebacks</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Filing a chargeback or payment dispute without contacting us first may result in immediate suspension or termination 
                of your account.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We strongly encourage you to reach out to us directly so we can resolve any billing issues quickly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Founder Circle Offer</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Founder Circle plans (Basic Founder: ₹2,999/month, Pro Founder: ₹6,999/month) are offered at a significant discount 
                and are limited to the first 10 subscribers.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                These plans follow the same 30-day money-back guarantee as regular plans.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                After the first 30 days, all Founder Circle subscriptions are final and non-refundable, except in cases of service 
                interruption or billing errors as outlined above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Payment Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Refunds are processed through Razorpay, our payment gateway partner. Refunds will be issued to the original payment 
                method used for the transaction.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Processing times may vary depending on your bank or payment provider. International refunds may take additional time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Refund Policy from time to time. Changes take effect immediately upon posting to this page.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                We will notify you of any significant changes via email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Questions</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our refund policy, contact us at:
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

export default Refund;

