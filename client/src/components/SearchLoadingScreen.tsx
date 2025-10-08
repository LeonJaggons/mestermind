interface SearchLoadingScreenProps {
  message?: string;
}

export default function SearchLoadingScreen({
  message = "We can help with that",
}: SearchLoadingScreenProps) {
  return (
    <div className="fixed top-16 border border-t-1 left-0 right-0 bottom-0 bg-white z-40 flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Three dots animation */}
        <div className="flex space-x-2 mb-6">
          <div
            className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        {/* Message */}
        <p className="text-gray-900 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
