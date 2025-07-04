import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Privacy Policy
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                VoiceBuilder - AI Voice Assistant Platform
              </p>
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
                <strong>Product Name:</strong> VoiceBuilder – AI Voice Assistant
                Management Platform
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Website:</strong>{" "}
                <a
                  href="https://voice-builder.gozupees.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  https://voice-builder.gozupees.com
                </a>
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                This Privacy Policy explains how GoZupees ("we," "our," or "us")
                collects, uses, shares, and protects your personal information
                when you use our VoiceBuilder AI Assistant platform, including
                our integration with third-party services such as Google
                Calendar via OAuth 2.0 authorization.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                We are committed to protecting user privacy, following industry
                best practices, and complying with applicable data protection
                laws and Google API Services User Data Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                2. Information We Collect
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We collect the following types of information:
              </p>

              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                a. OAuth Access Data (Google User Data)
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                If you authorize our application to access your Google Calendar:
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                We request OAuth 2.0 access only for the following scopes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                    https://www.googleapis.com/auth/calendar
                  </code>
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                This allows us to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>View available time slots on your primary calendar</li>
                <li>Book customer appointments into your calendar</li>
                <li>
                  Retrieve your email to associate calendar access with your
                  tenant account
                </li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                We do not access your full calendar history, email content,
                contacts, or any data outside the explicitly authorized scopes.
              </p>

              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                b. User-Provided Information
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                When signing up or configuring your assistant, you may provide:
              </p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300">
                <li>Business name, location, industry</li>
                <li>Contact email and phone number</li>
                <li>
                  Customer information (e.g. booking details during calls)
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                c. System Usage Data
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                We collect technical data including:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>Assistant usage (calls, bookings)</li>
                <li>Browser information and IP address</li>
                <li>Timestamps of logins, logouts, and API requests</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                We use the collected data to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>
                  Enable AI assistant functionality (e.g., appointment
                  scheduling via calendar)
                </li>
                <li>
                  Store and manage bookings, transcripts, and call metadata
                </li>
                <li>
                  Personalize assistant behavior based on your business settings
                </li>
                <li>Provide dashboard-level insights and management tools</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300">
                We do not sell or share user data with advertisers or
                unauthorized third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                4. Use of Google User Data
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our application uses Google Calendar data solely to schedule,
                manage, and display appointments to the user. We do not use any
                user data obtained from Google APIs to train AI or ML models.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We strictly adhere to Google's{" "}
                <a
                  href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy#limited-use"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  API Services User Data Policy
                </a>
                , including the{" "}
                <a
                  href="https://developers.google.com/workspace/workspace-api-user-data-developer-policy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Limited Use requirements for Workspace APIs
                </a>{" "}
                and, the{" "}
                <a
                  href="https://developers.google.com/photos/support/api-policy#limited_use_of_user_data"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Limited Use requirements for the Photos API
                </a>
                .
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We do not use Google user data for advertising, sharing, or any
                unauthorized secondary purpose.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We access your Google email address (userinfo.email) solely to
                link your account to our system and display which calendar is
                connected. This helps avoid conflicts when users operate
                multiple Google accounts. We do not use your email for marketing
                or third-party sharing.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                All data is used in real-time for core user-requested
                functionality and is not stored beyond what is operationally
                necessary.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                5. Data Storage & Security
              </h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>
                  All OAuth tokens and user credentials are stored in encrypted
                  format using AES-256 encryption.
                </li>
                <li>
                  Tokens are scoped per tenant and isolated at the account
                  level.
                </li>
                <li>
                  We implement TLS encryption for all data in transit and
                  enforce strong access controls for backend infrastructure.
                </li>
                <li>
                  No raw calendar data or event history is stored unless
                  explicitly created by the AI assistant.
                </li>
                <li>
                  You can revoke access to Google Calendar at any time from your
                  dashboard, which deletes all associated tokens and disables
                  further sync access.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                6. Data Retention
              </h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>
                  Call logs and appointment data are retained only as long as
                  needed for operational and compliance purposes.
                </li>
                <li>
                  You may request data deletion at any time by contacting our
                  support team at{" "}
                  <a
                    href="mailto:privacy@gozupees.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@gozupees.com
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                7. User Controls & Consent
              </h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li>
                  Users must explicitly grant calendar access via OAuth consent
                  screen.
                </li>
                <li>
                  Users may disconnect calendar access at any time from within
                  their account dashboard.
                </li>
                <li>
                  All assistant behavior is configurable and editable via the
                  dashboard.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                8. Children's Privacy
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                Our platform is intended for business users only and is not
                directed to individuals under the age of 13. We do not knowingly
                collect or process personal data from children.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                We may update this Privacy Policy as needed. Material changes
                will be notified via email or a banner on the dashboard.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                10. Contact Us
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                If you have any questions or concerns regarding this Privacy
                Policy or your data:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  <strong>GoZupees</strong>
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-1">
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:privacy@gozupees.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    privacy@gozupees.com
                  </a>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://voice-builder.gozupees.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    https://voice-builder.gozupees.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
