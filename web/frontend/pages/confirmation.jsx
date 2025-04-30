import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Layout, Page, SkeletonBodyText, Spinner } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useDispatch } from "react-redux";
import { login } from "../store/slices/authSlice";

export default function Confirmation() {
  const location = useLocation();
  const appBridge = useAppBridge();
  const navigate = useNavigate();

  const shopify = useMemo(() => {
    if (appBridge) {
      return {
        ...appBridge,
        navigate: Redirect.create(appBridge),
      };
    }
    return null;
  }, [appBridge]);

  const [status, setStatus] = useState("pending");
  const dispatch = useDispatch();

  const navigateToDashboard = useCallback(() => {
    if (
      shopify &&
      shopify.navigate &&
      typeof shopify.navigate.toApp === "function"
    ) {
      shopify.navigate.toApp({ path: "/dashboard" });
    } else {
      console.warn(
        "App Bridge navigation not available. Using fallback method."
      );
      navigate("/dashboard");
    }
  }, [shopify]);

  const confirmSubscription = useCallback(async () => {
    const searchParams = new URLSearchParams(location.search);
    const shop = searchParams.get("shop");
    const host = searchParams.get("host");
    const subscriptionId = searchParams.get("subscriptionId");
    const chargeId = searchParams.get("charge_id");

    if (!shop || !subscriptionId || !chargeId) {
      setStatus("error");
      return;
    }

    try {
      const response = await fetch(
        `/api/billing/confirmation?shop=${shop}&host=${host}&subscriptionId=${subscriptionId}&charge_id=${chargeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      const user = data.user;
      const subscription = data.subscription;

      console.log("Subscription confirmation response:", data);
      dispatch(login({ user, subscription }));

      setStatus("success");

      // Use the new navigation function
      navigateToDashboard();
    } catch (error) {
      console.error("Error confirming subscription:", error);
      setStatus("error");
    }
  }, [location, navigateToDashboard]);

  useEffect(() => {
    confirmSubscription();
  }, [confirmSubscription]);
  return (
    <Page>
      <Layout>
        <Layout.Section>
          {status === "pending" && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              <Spinner accessibilityLabel="Loading" size="large" />
            </div>
          )}
          {status === "success" && <p>Subscription Activated</p>}
          {status === "error" && (
            <p>
              There was an error confirming your subscription. Please try again.
            </p>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
