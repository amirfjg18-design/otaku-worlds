import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';

interface NavbarProps {
  brandName: string;
  instagramUrl: string;
  instagramHandle: string;
  cartCount: number;
  onOpenCart: () => void;
  onNavigateSection: (sectionId: string, categoryFilter?: string) => void;
}

export function Navbar({
  brandName,
  instagramUrl,
  instagramHandle,
  cartCount,
  onOpenCart,
  onNavigateSection,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (sectionId: string, categoryFilter?: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId, categoryFilter);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('top');
          }}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
        >
          {brandName}
        </a>

        {/* Zone 2: Clean single-line text nav links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'All')}
            className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'Anime Figures')}
            className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Anime
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'China Imports')}
            className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            China Imports
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('delivery')}
            className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Delivery
          </button>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-950 hover:underline underline-offset-4 decoration-zinc-400 transition-colors whitespace-nowrap shrink-0"
          >
            Instagram
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-950 hover:bg-red-600 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            aria-label={`Open shopping bag with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
            <span>Bag</span>
            <span className="font-mono text-xs tabular-nums">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-zinc-200 bg-white px-4 py-3 flex flex-col gap-1"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'All')}
            className="text-left px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-md cursor-pointer"
          >
            Full Catalog
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'Anime Figures')}
            className="text-left px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-md cursor-pointer"
          >
            Anime Figures
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'China Imports')}
            className="text-left px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-md cursor-pointer"
          >
            China Imports
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('delivery')}
            className="text-left px-3 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 rounded-md cursor-pointer"
          >
            Kenitra &amp; Morocco Delivery
          </button>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-zinc-100 rounded-md"
          >
            Instagram ({instagramHandle})
          </a>
        </nav>
      )}
    </header>
  );
}
