import { korykaaiPath } from "./korykaai-site";

export type KorykaaiNavItem = {
  href: string;
  label: string;
  description?: string;
  external?: boolean;
  /** Marks the current PageInk tool in the Work menu. */
  active?: boolean;
  hash?: boolean;
};

export type KorykaaiNavMenu = {
  id: string;
  label: string;
  items: KorykaaiNavItem[];
};

export const korykaaiPrimaryLinks: KorykaaiNavItem[] = [
  { href: korykaaiPath("/"), label: "Home" },
  { href: korykaaiPath("/founders-build-os"), label: "Build OS" },
  { href: korykaaiPath("/resources"), label: "Resources" },
];

export const korykaaiNavMenus: KorykaaiNavMenu[] = [
  {
    id: "work",
    label: "Work",
    items: [
      {
        href: korykaaiPath("/case-studies"),
        label: "Case Studies",
        description: "Technical PM product write-ups",
      },
      {
        href: "https://pageink.korykaai.com",
        label: "PageInk",
        description: "Private PDF text editor — open source",
        active: true,
      },
      {
        href: korykaaiPath("/open-source"),
        label: "Open Source",
        description: "GitHub projects & OSS toolchain",
      },
      {
        href: korykaaiPath("/web-projects"),
        label: "Web Projects",
        description: "Freelance websites & web ops",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    items: [
      {
        href: "https://pageink.korykaai.com",
        label: "PageInk",
        description: "Private in-browser PDF text editor — open source, no upload",
        active: true,
      },
      {
        href: "https://www.veteranoneup.com",
        label: "VeteranOneUp",
        description: "Veteran benefits, checklist, and Money Mission tools",
        external: true,
      },
      {
        href: "https://www.ipentesting.com",
        label: "iPentesting",
        description: "External security monitoring and client-ready reports",
        external: true,
      },
      {
        href: "https://kaai.io",
        label: "Kaai.io",
        description: "ATS resumes, job tailoring, and interview prep",
        external: true,
      },
      {
        href: "https://clientsdock.com",
        label: "ClientsDock",
        description: "Client portals, file sharing, and project tracking",
        external: true,
      },
      {
        href: "https://namemetrix.com",
        label: "NameMetrix",
        description: "Domain scoring, valuation, and portfolio tools",
        external: true,
      },
      {
        href: "https://www.joltreview.com",
        label: "JoltReview",
        description: "Customer feedback, review links, and recovery tasks",
        external: true,
      },
      {
        href: "https://kaaitech.com",
        label: "KAAI TECH",
        description: "Consulting practice and product studio home",
        external: true,
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        href: korykaaiPath("/blog"),
        label: "Blog",
        description: "Articles on delivery & systems",
      },
      {
        href: korykaaiPath("/videos"),
        label: "Videos",
        description: "Walkthroughs & channel Shorts",
      },
      {
        href: korykaaiPath("/start"),
        label: "Founder toolkit",
        description: "Free templates path for Instagram / bio traffic",
      },
      {
        href: korykaaiPath("/founders-build-os"),
        label: "Founders Build OS",
        description: "Guided startup planning app",
      },
      {
        href: korykaaiPath("/resources"),
        label: "Resources",
        description: "Templates, checklists & case studies",
      },
      {
        href: korykaaiPath("/tools"),
        label: "Tools",
        description: "JSON, Base64 & color utilities",
      },
    ],
  },
  {
    id: "more",
    label: "More",
    items: [
      {
        href: korykaaiPath("/#about"),
        label: "About",
        description: "Background on the homepage",
        hash: true,
      },
      {
        href: korykaaiPath("/#contact"),
        label: "Contact",
        description: "Get in touch",
        hash: true,
      },
      { href: korykaaiPath("/privacy"), label: "Privacy", description: "Privacy policy" },
      { href: korykaaiPath("/cookies"), label: "Cookies", description: "Cookie policy" },
      { href: korykaaiPath("/ccpa"), label: "CCPA", description: "California privacy notice" },
      { href: korykaaiPath("/dpa"), label: "DPA", description: "Data processing agreement" },
      { href: korykaaiPath("/terms"), label: "Terms", description: "Terms of use" },
      { href: korykaaiPath("/refund"), label: "Refunds", description: "Refund policy" },
    ],
  },
];

export function menuHasActiveChild(menu: KorykaaiNavMenu): boolean {
  return menu.items.some((item) => item.active);
}
