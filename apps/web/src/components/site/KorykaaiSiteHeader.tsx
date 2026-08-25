"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  korykaaiNavMenus,
  korykaaiPrimaryLinks,
  menuHasActiveChild,
  type KorykaaiNavItem,
  type KorykaaiNavMenu,
} from "@/lib/korykaai-nav";
import { korykaaiLogoUrl, korykaaiPath } from "@/lib/korykaai-site";

function NavLink({
  href,
  label,
  active,
  hash,
  external,
  className,
  activeClassName,
  onNavigate,
}: {
  href: string;
  label: string;
  active?: boolean;
  hash?: boolean;
  external?: boolean;
  className: string;
  activeClassName: string;
  onNavigate?: () => void;
}) {
  const cls = `${className}${active ? ` ${activeClassName}` : ""}`;
  return (
    <a
      href={href}
      className={cls}
      onClick={onNavigate}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {label}
    </a>
  );
}

function NavMenuItem({
  item,
  className,
  activeClassName,
  onNavigate,
}: {
  item: KorykaaiNavItem;
  className: string;
  activeClassName: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="creative-site-header__mega-link-wrap">
      <NavLink
        href={item.href}
        label={item.label}
        active={item.active}
        hash={item.hash}
        external={item.external}
        className={className}
        activeClassName={activeClassName}
        onNavigate={onNavigate}
      />
      {item.description ? (
        <span className="creative-site-header__mega-link-desc">{item.description}</span>
      ) : null}
    </div>
  );
}

function SiteNavDropdowns({
  openMenuId,
  setOpenMenuId,
  onNavigate,
  variant,
}: {
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onNavigate?: () => void;
  variant: "bar" | "drawer";
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenMenuId(null), 140);
  };

  useEffect(() => {
    if (variant !== "bar" || openMenuId === null) {
      return;
    }
    const onDocPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      const target = e.target as Node | null;
      if (el && target && !el.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, [openMenuId, setOpenMenuId, variant]);

  useEffect(() => {
    if (openMenuId === null) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenuId, setOpenMenuId]);

  useEffect(() => () => clearCloseTimer(), []);

  if (variant === "drawer") {
    return (
      <div className="creative-site-header__drawer-menus">
        {korykaaiNavMenus.map((menu) => (
          <DrawerMenuGroup key={menu.id} menu={menu} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="creative-site-header__bar-nav"
      onMouseLeave={scheduleClose}
    >
      {korykaaiPrimaryLinks.map((item) => (
        <span key={item.href} className="creative-site-header__primary-wrap">
          <NavLink
            href={item.href}
            label={item.label}
            active={item.active}
            hash={item.hash}
            className="creative-site-header__primary-link"
            activeClassName="creative-site-header__primary-link--active"
            onNavigate={onNavigate}
          />
        </span>
      ))}

      {korykaaiNavMenus.map((menu) => {
        const open = openMenuId === menu.id;
        const hasActive = menuHasActiveChild(menu);
        const panelId = `site-nav-menu-${menu.id}`;
        const btnId = `site-nav-menu-btn-${menu.id}`;

        return (
          <div
            key={menu.id}
            className={`creative-site-header__mega${open ? " creative-site-header__mega--open" : ""}`}
            onMouseEnter={() => {
              clearCloseTimer();
              setOpenMenuId(menu.id);
            }}
          >
            <button
              id={btnId}
              type="button"
              className={`creative-site-header__mega-trigger${
                open ? " creative-site-header__mega-trigger--open" : ""
              }${hasActive ? " creative-site-header__mega-trigger--has-active" : ""}`}
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="true"
              onClick={() => setOpenMenuId(open ? null : menu.id)}
            >
              <span className="creative-site-header__mega-trigger-text">{menu.label}</span>
              <span className="creative-site-header__mega-chevron" aria-hidden />
            </button>
            <div
              id={panelId}
              role="menu"
              aria-labelledby={btnId}
              className="creative-site-header__mega-panel"
              aria-hidden={!open}
            >
              <div className="creative-site-header__mega-panel-inner">
                <p className="creative-site-header__mega-panel-kicker">{menu.label}</p>
                {menu.items.map((item) => (
                  <NavMenuItem
                    key={item.href}
                    item={item}
                    className="creative-site-header__mega-link"
                    activeClassName="creative-site-header__mega-link--active"
                    onNavigate={() => {
                      setOpenMenuId(null);
                      onNavigate?.();
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrawerMenuGroup({
  menu,
  onNavigate,
}: {
  menu: KorykaaiNavMenu;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(() => menuHasActiveChild(menu));
  const panelId = useId();

  return (
    <div
      className={`creative-site-header__drawer-group${open ? " creative-site-header__drawer-group--open" : ""}`}
    >
      <button
        type="button"
        className="creative-site-header__drawer-group-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{menu.label}</span>
        <span className="creative-site-header__drawer-group-chevron" aria-hidden />
      </button>
      <div id={panelId} className="creative-site-header__drawer-group-panel" hidden={!open}>
        {menu.items.map((item) => (
          <div key={item.href} className="creative-site-header__drawer-item">
            <NavLink
              href={item.href}
              label={item.label}
              active={item.active}
              hash={item.hash}
              external={item.external}
              className="creative-site-header__drawer-link"
              activeClassName="creative-site-header__drawer-link--active"
              onNavigate={onNavigate}
            />
            {item.description ? (
              <span className="creative-site-header__drawer-link-desc">{item.description}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared korykaai.com navbar — links back to the main site from the PageInk subdomain. */
export function KorykaaiSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const drawerTitleId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hadMenuOpenRef = useRef(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 900px)");
    const onChange = () => {
      if (mobile.matches) {
        setOpenMenuId(null);
      }
    };
    mobile.addEventListener("change", onChange);
    onChange();
    return () => mobile.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    hadMenuOpenRef.current = true;
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (menuOpen) {
      return;
    }
    if (!hadMenuOpenRef.current) {
      return;
    }
    hadMenuOpenRef.current = false;
    menuButtonRef.current?.focus({ preventScroll: true });
  }, [menuOpen]);

  return (
    <>
      <header className="creative-site-header creative-site-header--enter">
        <div className="creative-site-header__bar">
          <div className="creative-site-header__inner">
            <div className="creative-site-header__brand-row">
              <a href={korykaaiPath("/")} className="creative-site-header__brand">
                <span className="creative-site-header__brand-mark" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element -- brand mark hosted on korykaai.com */}
                  <img
                    src={korykaaiLogoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="creative-site-header__brand-logo-img"
                    decoding="async"
                  />
                </span>
                <span className="creative-site-header__brand-text">
                  <span className="creative-site-header__brand-name">Kory Kaai</span>
                  <span className="creative-site-header__brand-sub">Technical PM · systems delivery</span>
                </span>
              </a>
            </div>

            <nav className="creative-site-header__nav creative-site-header__nav--desktop" aria-label="Site">
              <SiteNavDropdowns
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                variant="bar"
              />
            </nav>

            <div className="creative-site-header__actions">
              <a href={korykaaiPath("/login")} className="creative-site-header__auth-btn">
                Log in
              </a>
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              className={`creative-site-header__menu-toggle${menuOpen ? " creative-site-header__menu-toggle--open" : ""}`}
              aria-expanded={menuOpen}
              aria-controls="site-public-nav-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="creative-site-header__menu-toggle-label">
                {menuOpen ? "Close menu" : "Open menu"}
              </span>
              <span className="creative-site-header__menu-toggle-bars" aria-hidden>
                <span className="creative-site-header__menu-toggle-bar" />
                <span className="creative-site-header__menu-toggle-bar" />
                <span className="creative-site-header__menu-toggle-bar" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`creative-site-header__drawer-backdrop${menuOpen ? " creative-site-header__drawer-backdrop--open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />

      <div
        id="site-public-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
        className={`creative-site-header__drawer${menuOpen ? " creative-site-header__drawer--open" : ""}`}
        inert={!menuOpen}
      >
        <div className="creative-site-header__drawer-top">
          <p id={drawerTitleId} className="creative-site-header__drawer-title">
            Menu
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            className="creative-site-header__drawer-close"
            aria-label="Close menu"
            onClick={closeMenu}
          >
            <span className="creative-site-header__drawer-close-icon" aria-hidden />
          </button>
        </div>
        <nav className="creative-site-header__drawer-nav" aria-label="Site">
          <div className="creative-site-header__drawer-scroll">
            <div className="creative-site-header__drawer-auth">
              <a
                href={korykaaiPath("/login")}
                className="creative-site-header__auth-btn creative-site-header__auth-btn--drawer"
                onClick={closeMenu}
              >
                Log in
              </a>
            </div>
            <div className="creative-site-header__drawer-primary">
              {korykaaiPrimaryLinks.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={item.active}
                  hash={item.hash}
                  className="creative-site-header__drawer-link creative-site-header__drawer-link--primary"
                  activeClassName="creative-site-header__drawer-link--active"
                  onNavigate={closeMenu}
                />
              ))}
            </div>
            <SiteNavDropdowns
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onNavigate={closeMenu}
              variant="drawer"
            />
          </div>
        </nav>
      </div>
    </>
  );
}
