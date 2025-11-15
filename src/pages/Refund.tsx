import { HomeHeader } from "@/components/HomeHeader";
import { HomeFooter } from "@/components/HomeFooter";

const Refund = () => {
  return (
    <div className="bg-white min-h-screen">
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
                At unifr, we want you to be completely satisfied with our AI visibility tracking service. This Refund Policy 
                outlines the circumstances under which we provide refunds for subscription fees.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Refund Eligibility</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We offer refunds under the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li><strong>30-Day Money-Back Guarantee:</strong> New subscribers are eligible for a full refund within 30 days 
                of their initial subscription date if they are not satisfied with the Service.</li>
                <li><strong>Service Interruption:</strong> If the Service is unavailable for more than 48 consecutive hours due 
                to our fault, you may be eligible for a prorated refund for the affected period.</li>
                <li><strong>Billing Errors:</strong> If you are charged incorrectly due to our error, we will refund the 
                overcharged amount.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Non-Refundable Items</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Subscriptions cancelled after the 30-day guarantee period</li>
                <li>Usage-based charges that have already been consumed (e.g., AI scans that have been completed)</li>
                <li>Enterprise plans with custom contracts (subject to contract terms)</li>
                <li>Refunds requested due to changes in AI model responses or visibility scores (these are outside our control)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How to Request a Refund</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To request a refund, please:
              </p>
              <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
                <li>Contact us through <a href="/contact" className="text-gray-900 underline hover:text-gray-700">our contact page</a> 
                or email support</li>
                <li>Include your account email and subscription details</li>
                <li>Provide a brief explanation for the refund request</li>
                <li>We will review your request within 5-7 business days</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Refund Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Once approved, refunds will be processed to the original payment method within 7-10 business days. The time it 
                takes for the refund to appear in your account depends on your payment provider. You will receive an email 
                confirmation once the refund has been processed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Subscription Cancellation</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may cancel your subscription at any time through your account settings. Cancellation will take effect at the 
                end of your current billing period. You will continue to have access to the Service until the end of the paid 
                period. No refunds are provided for the remaining unused portion of a billing cycle unless you are within the 
                30-day guarantee period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Chargebacks</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you file a chargeback or dispute a charge with your payment provider, we reserve the right to suspend or 
                terminate your account immediately. We encourage you to contact us directly to resolve any billing issues before 
                initiating a chargeback.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Founder Circle Offer</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Lifetime pricing offers (Founder Circle) are final and non-refundable after the initial 30-day guarantee period. 
                These special offers are provided at a significant discount and are subject to the same refund policy for the 
                first 30 days only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting 
                to this page. We will notify users of any material changes via email.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Questions</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about our refund policy, please contact us at{" "}
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

export default Refund;

