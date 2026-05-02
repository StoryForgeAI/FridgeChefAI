export default function HomePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">FridgeChef AI</h1>
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <p className="text-gray-600">Welcome to FridgeChef AI</p>
        <p className="text-sm text-gray-500 mt-2">Your AI-powered recipe generator</p>
      </div>
      <div className="space-y-2">
        <a href="/scanner" className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg">
          Scan Items
        </a>
        <a href="/stats" className="block w-full bg-gray-200 text-center py-3 rounded-lg">
          View Stats
        </a>
        <a href="/profile" className="block w-full bg-gray-200 text-center py-3 rounded-lg">
          Profile
        </a>
      </div>
    </div>
  );
}
