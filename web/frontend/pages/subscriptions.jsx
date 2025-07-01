import { useState } from "react";
import {
  Card,
  Page,
  Layout,
  Text,
  TextContainer,
  ButtonGroup,
  Button,
  LegacyCard,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import Subscription from "../components/Subscription";
import { logo } from "../assets";

export default function SubscriptionsPage({
  subscriptions,
  activePlan,
}) {
  const { t } = useTranslation();
  const [interval, setInterval] = useState("monthly");

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <div
            className="d-flex justify-content-center"
            style={{ marginBottom: 24 }}
          >
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                border: "1px solid #d6d6d6",
                padding: 8,
                borderRadius: 8,
                background: "#f9f9fc",
                gap: 8,
              }}
            >
              <div
                onClick={() => setInterval("monthly")}
                className="d-flex"
                style={{
                  border: interval == "monthly" ? "1px solid #d6d6d6" : "none",
                  background: interval == "monthly" ? "#fff" : "transparent",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                <p
                  style={{ fontWeight: interval == "monthly" ? 600 : "normal" }}
                >
                  Pay Monthly
                </p>
              </div>
              {/* <div
                onClick={() => setInterval("yearly")}
                className="d-flex"
                style={{
                  border: interval == "yearly" ? "1px solid #d6d6d6" : "none",
                  background: interval == "yearly" ? "#fff" : "transparent",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                <p
                  style={{ fontWeight: interval == "yearly" ? 600 : "normal" }}
                >
                  Pay Yearly
                </p>
              </div> */}
            </div>
          </div>

          <Subscription
            subscriptions={subscriptions}
            activePlan={activePlan}
          />

          <div className="d-flex justify-content-end mt-4">
            <img src={logo} alt="share cart logo" srcset="" width="200px" />
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
