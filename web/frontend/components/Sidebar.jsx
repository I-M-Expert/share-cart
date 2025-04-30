import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export const mainMenu = [
  {
    title: "Dashboard",
    slug: "dashboard",
    link: "/dashboard",
  },
  {
    title: "Widget",
    slug: "widget",
    link: "/widget",
  },
  {
    title: "Coupons",
    slug: "coupons",
    link: "/coupons",
  },
  {
    title: "Activity",
    slug: "activity",
    link: "/activity",
  },
  {
    title: "Plans",
    slug: "plans",
    link: "/plans",
  },
  {
    title: "Support",
    slug: "support",
    link: "/support",
  },
];

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNav = (link) => {
    navigate(link);
  };

  const userPermissions = useSelector(state => state.auth.subscription?.subscription?.permissions);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    useEffect(() => {
        checkSubscription();
        // eslint-disable-next-line
      }, []);

    const checkSubscription = async () => {
      try {
        const response = await fetch("/api/billing/check-subscription", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.subscription) {
          } else {
            navigate('/');
          }
        } else {
          console.error("Failed to fetch subscriptions");
        }
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      }
    };


  if (isMobile) {
    return null; // Don't render sidebar on mobile
  }

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "white",
        position: "fixed",
        top: 0,
        left: 0,
        width: "260px",
        height: "100vh",
        overflowY: "auto",
        zIndex: 1000,
      }}
      className="sidebar"
    >
      {mainMenu.map((item, index) => {
        const isActive = currentPath.includes(item.link);
        // const SvgIcon = item.icon;

        return (
          <div
            key={index}
            className="d-flex align-items-center my-3"
            style={{
              width: "100%",
              backgroundColor: isActive ? "#00c2b9" : "transparent",
              borderRadius: "8px",
              height: "36px",
              padding: "12px 1px",
              cursor: "pointer",
            }}
          >
            <div style={{ width: "40px" }} onClick={() => handleNav(item.link)}>
              {/* <SvgIcon style={{ fill: isActive ? "#0C449B" : "#000" }} /> */}
            </div>
            <a
              onClick={() => handleNav(item.link)}
              style={{
                textDecoration: "none",
                color: isActive ? "#fff" : "#000",
                fontWeight: isActive ? "700" : "400",
              }}
            >
              {item.title}
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default Sidebar;
