export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center py-12">
          <h1 className="text-4xl md:text-6xl font-bold text-green-700 mb-4">
            उम्मीद से हरी
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-green-600 mb-6">
            Ummid Se Hari
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Smart, Green & Transparent Village PWA for Damday–Chuanala, Gangolihat, Pithoragarh, Uttarakhand
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              Governance & Transparency
            </h3>
            <p className="text-gray-600">
              Track village projects, budgets, and participate in transparent governance.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              Smart & Carbon-Free
            </h3>
            <p className="text-gray-600">
              Calculate carbon footprint, explore solar solutions, and join environmental initiatives.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              Citizen Services
            </h3>
            <p className="text-gray-600">
              Submit complaints, RTI requests, and access essential village services.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            PWA Bootstrap Complete - PR01 Implementation
          </p>
        </div>
      </div>
    </main>
  )
}