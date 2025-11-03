// File: /src/app/thank-you/page.tsx
export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Thank You!</h1>
        <p className="mb-6 text-gray-600">
          Your kitchen design form has been submitted successfully. Our team will review your requirements and contact
          you soon to discuss your project.
        </p>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>What's next?</strong>
            <br />
            We'll be in touch within 1-2 business days to schedule a consultation and discuss your kitchen design
            vision.
          </p>
        </div>
      </div>
    </div>
  );
}
