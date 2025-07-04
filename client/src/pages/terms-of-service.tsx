import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Terms of Service</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">VoiceBuilder - AI Voice Assistant Platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div className="mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Effective Date:</strong> June 20, 2025
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Last Updated:</strong> June 20, 2025
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Company Name:</strong> GoZupees
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Product Name:</strong> VoiceBuilder – AI Voice Assistant Management Platform
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Website:</strong> <a href="https://voice-builder.gozupees.com" className="text-blue-600 dark:text-blue-400 hover:underline">https://voice-builder.gozupees.com</a>
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By accessing or using the VoiceBuilder platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of these Terms, you must not access the Service.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                These Terms constitute a binding agreement between you ("Customer", "You", or "Your") and GoZupees ("Company", "we", "our", or "us").
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 dark:text-gray-300">
                VoiceBuilder is a SaaS platform that allows businesses to create, configure, and manage AI-powered voice assistants capable of handling appointment bookings, customer inquiries, and voice-based workflows. The service integrates with third-party APIs, including Google Calendar and VAPI, to deliver its functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">To use the Service, you must register for an account. You agree to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain the security of your login credentials.</li>
                <li>Notify us immediately of any unauthorized use or breach of your account.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">4. Calendar Integration</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">If you connect your Google Calendar to the platform:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>You authorize us to access, read availability, and create new appointments in your calendar using OAuth 2.0 scopes.</li>
                <li>We only access data explicitly permitted by you.</li>
                <li>You may disconnect calendar access at any time from your dashboard, which immediately revokes all calendar-related functionality.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">5. Intellectual Property</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                All content, features, and functionality of the VoiceBuilder platform (including source code, UI/UX design, documentation, and branding) are the exclusive property of GoZupees and protected under intellectual property laws. You may not copy, reverse-engineer, or redistribute any part of the platform without our written permission.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Your own business data and assistant content remain yours. We do not claim ownership of customer-specific knowledge bases or configuration data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">6. Acceptable Use</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>Use the service for illegal, harmful, or fraudulent activities.</li>
                <li>Impersonate another business or entity.</li>
                <li>Interfere with the proper functioning of the platform.</li>
                <li>Attempt unauthorized access to the backend systems or other users' data.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">7. Privacy and Data Use</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our Privacy Policy governs how we collect, store, and process your data. By using the Service, you consent to our use of your data in accordance with that policy.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We follow strict encryption and access control protocols to protect your business and customer information. You remain the owner of your calendar data, call logs, and assistant configurations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">8. Subscription & Termination</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Access to the VoiceBuilder platform may require a subscription. We reserve the right to modify pricing and billing terms with prior notice.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You may cancel your subscription and delete your data at any time via the dashboard or by contacting support.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We may suspend or terminate your account for violation of these Terms or misuse of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The VoiceBuilder platform is provided "as-is" and "as-available." While we strive for high availability and performance, we do not guarantee uninterrupted service.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                To the fullest extent permitted by law, GoZupees is not liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">10. Modifications to Terms</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may revise these Terms from time to time. We will notify users of significant changes via email or dashboard notification. Continued use of the Service after changes constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 dark:text-gray-300">
                These Terms are governed by and construed in accordance with the laws of the United Kingdom, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                If you have questions about these Terms:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>GoZupees</strong></p>
                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  <strong>Email:</strong> <a href="mailto:support@gozupees.com" className="text-blue-600 dark:text-blue-400 hover:underline">support@gozupees.com</a>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Website:</strong> <a href="https://voice-builder.gozupees.com" className="text-blue-600 dark:text-blue-400 hover:underline">https://voice-builder.gozupees.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}