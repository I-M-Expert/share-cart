import { useMemo, useState, useEffect } from 'react'
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Text,
  Spinner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation, Trans } from "react-i18next";

import { trophyImage } from "../assets";

import { ProductsCard } from "../components";



import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";

import Subscription from "../components/Subscription";
import { useNavigate } from "react-router-dom";
import SubscriptionsPage from './subscriptions';
import { login } from '../store/slices/authSlice';
import { useDispatch } from 'react-redux';

export default function HomePage() {
  const { t } = useTranslation();

  const app = useAppBridge();
  const redirect = Redirect.create(app);
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true); // <-- Add loading state
  const appBridge = useAppBridge();

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
          console.log('subscription', data.subscription)
          dispatch(login({ user:data.user, subscription:data.subscription }));
          navigate("dashboard");
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

if (loading) {
  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
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
        </Layout.Section>
      </Layout>
    </Page>
  );
}

return <SubscriptionsPage subscriptions={subscriptions} app={app} handleRedirect={handleRedirect} />;
}
