import { Link } from "react-router-dom";
import { TrendingUp, Linkedin } from "lucide-react";

export const HomeFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white relative">
      <div className="max-w-7xl mx-auto px-3 lg:px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Product</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-gray-900 transition-colors">Dashboard</a></li>
              <li><Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link to="/demo" className="hover:text-gray-900 transition-colors text-indigo-600 font-semibold">Book a Demo</Link></li>
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
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="citero logo" className="w-6 h-6 rounded-md object-contain drop-shadow-sm" />
              <span className="text-sm font-semibold text-gray-900">citero</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://www.linkedin.com/company/citero" target="_blank" rel="noopener noreferrer" 
                 className="text-gray-400 hover:text-gray-600 transition-colors hover:scale-110 transform duration-200">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
          <p className="text-center md:text-left text-sm text-gray-500 mt-6">
            © {currentYear} citero — All Rights Reserved.
          </p>
        </div>
      </div>
      
      {/* Hidden featured badges for SEO/tracking - positioned off-screen but still rendered for verification */}
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'visible',
          zIndex: -1
        }}
      >
        <div style={{ position: 'relative', width: '200px', height: '60px' }}>
          <a href="https://www.producthunt.com/products/citero-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-citero-ai" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1037308&theme=neutral&t=1763916799417" 
              alt="Citero AI - Multiply Your Traffic from AI Agents | Product Hunt" 
              width="200" 
              height="43" 
            />
          </a>
          <a href="https://theindiewall.net" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://theindiewall.net/indiewall.svg" 
              alt="IndieWall" 
              width="120" 
              height="60" 
            />
          </a>
          <a href="https://startupfa.me/s/citero?utm_source=www.citero.online" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://startupfa.me/badges/featured/dark.webp" 
              alt="citero - Featured on Startup Fame" 
              width="171" 
              height="54" 
            />
          </a>
          <a href="https://dofollow.tools" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://dofollow.tools/badge/badge_dark.svg" 
              alt="Featured on Dofollow.Tools" 
              width="200" 
              height="54" 
            />
          </a>
          <a href="https://auraplusplus.com/projects/ai-brand-monitoring-optimization" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://auraplusplus.com/images/badges/featured-on-light.svg" 
              alt="Featured on Aura++" 
            />
          </a>
          <a href="https://launchigniter.com/product/citero?ref=badge-citero" target="_blank" rel="noopener noreferrer">
            <img 
              src="https://launchigniter.com/api/badge/citero?theme=neutral" 
              alt="Featured on LaunchIgniter" 
              width="212" 
              height="55" 
            />
          </a>
          <a href="https://fazier.com/launches/www.citero.online" target="_blank">
            <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral" width="120" alt="Fazier badge" />
          </a>
          <a href="https://similarlabs.com/?ref=embed" target="_blank" rel="noopener noreferrer" style={{ cursor: 'pointer' }}>
            <img 
              src="https://similarlabs.com/similarlabs-embed-badge-light.svg" 
              alt="SimilarLabs Embed Badge" 
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

