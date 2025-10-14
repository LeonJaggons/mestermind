import Link from "next/link";
import { useRouter } from "next/router";
import { 
  LuYoutube, 
  LuFacebook, 
  LuInstagram, 
  LuTwitter, 
  LuLinkedin 
} from "react-icons/lu";

export default function Footer() {
  const router = useRouter();
  const isPro = router.pathname.startsWith("/pro");
  if(isPro) {
    return null;
  }
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo and Copyright */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center">
                <span
                  style={{ fontFamily: "var(--font-heading)" }}
                  className="text-xl font-bold text-gray-800"
                >
                  Mestermind
                </span>
                <span className="text-xs ml-[1px] text-gray-500">®</span>
              </Link>
              <p className="text-sm text-gray-500">
                © 2025, Mestermind
              </p>
            </div>

            {/* Our Social Pages */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Our social pages
              </h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="https://youtube.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LuYoutube className="w-4 h-4 mr-2" />
                    YouTube
                  </a>
                </li>
                <li>
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LuFacebook className="w-4 h-4 mr-2" />
                    Facebook
                  </a>
                </li>
                <li>
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LuInstagram className="w-4 h-4 mr-2" />
                    Instagram
                  </a>
                </li>
                <li>
                  <a 
                    href="https://twitter.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LuTwitter className="w-4 h-4 mr-2" />
                    Twitter
                  </a>
                </li>
                <li>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LuLinkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>

            {/* How Does It Work */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                How does it work?
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/how-it-works" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    How do things work here?
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/become-professional" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    How can you become a professional?
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/risk-free" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Risk-free business
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/trust-guarantee" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Trust and guarantee
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/faq" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Questions and answers
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/support" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Customer service
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/terms" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    General Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* About Us */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                About us
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    href="/blog" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/tips" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Tips from professionals
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/pricing" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Price comparison
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/success-stories" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Success stories
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/contact" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Our contact details
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/privacy" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/links" 
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Link catalog
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

