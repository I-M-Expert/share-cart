import React, { useMemo, useState, useEffect } from "react";
import SubscriptionsPage from "./subscriptions";
import Sidebar from "../components/Sidebar";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@shopify/polaris";
import { useDispatch } from "react-redux";
import { login } from "../store/slices/authSlice";

export default function Plans() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true); 
  const appBridge = useAppBridge();
  const [activePlan, setActivePlan] = useState(null);

  const dispatch = useDispatch();

  const shopify = useMemo(() => {
    if (appBridge) {
      return {
        ...appBridge,
        navigate: Redirect.create(appBridge),
      };
    }
    return null;
  }, [appBridge]);

  useEffect(() => {
    checkSubscription();
    fetchSubscriptions();
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
          dispatch(login({ user: data.user, subscription: data.subscription }));
            setActivePlan(data.subscription);
        } else {
          setLoading(false); // <-- Only stop loading if no subscription
        }
      } else {
        setLoading(false);
        console.error("Failed to fetch subscriptions");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error fetching subscriptions:", error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/billing/fetch-subscription", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();

        setSubscriptions(data);
        setLoading(false);
      } else {
        console.error("Failed to fetch subscriptions");
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const handleRedirect = (url) => {
    redirect.dispatch(Redirect.Action.APP, url);
  };
  return (
    <div
      className="dashboard-container"
      style={{ display: "flex", minHeight: "100vh" }}
    >
      <Sidebar />
      <main
        className="main-content"
        style={{ flexGrow: 1, padding: "32px 32px 32px 0", marginLeft: 0 }}
      >
        {loading ? (
          <div className="d-flex jcc ac">
            <Spinner accessibilityLabel="Loading" size="large" />
          </div>
        ) : (
          <SubscriptionsPage
            subscriptions={subscriptions}
            app={app}
            handleRedirect={handleRedirect}
            activePlan={activePlan}
          />
        )}
      </main>
    </div>
  );
}
