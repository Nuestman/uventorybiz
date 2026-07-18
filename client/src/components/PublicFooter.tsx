import { Link } from "wouter";
import { BrandLogo } from "@/components/BrandLogo";

export default function PublicFooter() {
  return (
    <footer className="bg-[#142F5C] text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 grid-cols-2 gap-8 mb-8">
          <div>
            <Link href="/">
              <BrandLogo
                variant="full"
                alt="uventorybiz"
                className="h-10 w-auto mb-4 brightness-0 invert cursor-pointer"
              />
            </Link>
            <p className="text-white/60 text-sm">
              Enterprise business management for multi-site companies worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/auth" className="hover:text-white">
                  Staff sign in
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white">
                  Customer portal
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-white">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="hover:text-white">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-white">
                  Agreements
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white">
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-white/60 text-sm">
          © 2025 uventorybiz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
