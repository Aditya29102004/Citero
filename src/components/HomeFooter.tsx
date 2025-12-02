import { Link } from "react-router-dom";
import { TrendingUp, Linkedin } from "lucide-react";

export const HomeFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-3 lg:px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Product</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-gray-900 transition-colors">Dashboard</a></li>
              <li><Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Company</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link to="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Resources</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Legal</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
              <li><Link to="/refund" className="hover:text-gray-900 transition-colors">Refund Policy</Link></li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">
              Payments powered by{" "}
              <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                Razorpay
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-900 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">unifr</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://www.linkedin.com/company/unifr" target="_blank" rel="noopener noreferrer" 
                 className="text-gray-400 hover:text-gray-600 transition-colors hover:scale-110 transform duration-200">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          <p className="text-center md:text-left text-sm text-gray-500 mt-6">
            © {currentYear} unifr — All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

