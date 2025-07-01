import React, { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Redirect } from "@shopify/app-bridge/actions";
import Check from "./svgs/Check";
import Button from "./form/Button";


const Subscription = ({ subscriptions, activePlan=null }) => {
  const app = useAppBridge();
  const [planType, setPlanType] = useState("monthly");
  const [filteredSubscriptions, setFilteredSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const updatedSubscriptions = subscriptions?.filter(
      (subscription) => subscription.duration === planType
    );
    setFilteredSubscriptions(updatedSubscriptions);
  }, [planType, subscriptions]);

  const handlePlanChange = (type) => {
    setPlanType(type);
  };

const handleSelectPlan = async (id, amount) => {
  setLoading(true)
  setSelected(id);
  try {
    const response = await fetch("/api/billing/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscriptionId: id }),
    });

    const data = await response.json();
    if (data.success && data.confirmationUrl) {
      if(amount == 0){
      window.top.location.href = `/dashboard?subscriptionActive=true&plan=${data.subscription.name}`;  
      }
      // Redirect to Shopify's test billing page
      window.top.location.href = data.confirmationUrl;
    } else {
      console.error("Error creating subscription:", data.errors);
      // Handle error (show message to user, etc.)
    }
  } catch (error) {
    console.error("Failed to create subscription:", error);
    // Handle error
  }finally{
    setLoading(false);
  }
};




  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  return (
    <div className="">
      <div
        style={{
          marginTop: "24px",
        }}
      >
        <div className="d-lg-flex aie my-3 jcc flex-sm-wrap" style={{ overflowX: "auto" }}>
          {filteredSubscriptions?.map((subscription) => (
            <div
              key={subscription._id}
              className="col-lg-3 col-md-3 col-sm-12 m-3"
              style={{
                background:
                  subscription.name.toLowerCase() === "standard" ? "#32c6ce" : "",
                borderRadius: "12px",
                cursor: "pointer",
                flexGrow: 1,
                minWidth: "250px",
                maxWidth: "300px",
              }}
            >
              <p
                className="fs14 text-center"
                style={{ padding: "10px 26px", color: "#fff", fontWeight: 600 }}
              >
                {subscription.name.toLowerCase() === "standard" ? "Popular" : ""}
              </p>
              <div
                style={{
                  background: "#FBFBFB",
                  borderRadius: "12px",
                  border: "1px solid #C6C6C6",
                  padding: "16px",
                  margin: "1px",
                }}
                className="d-flex jcs flex-column gap-3"
              >
                <div className="mb-2">
                  <p className="fs36 text-center fw700">{subscription.name}</p>
                </div>
                {subscription?.name != 'Free' && <div className="d-flex jcc aie">
                  <p className="fw600 fs32 text-center">
                    ${subscription.amount}
                  </p>
                  <p className="fs14" style={{ color: "#777777" }}>
                    /{subscription.duration}
                  </p>
                </div>}

                <p className="fs12">{subscription.description} </p>

                <div>
                  {subscription?.features?.map((feature, index) => (
                    <div key={index}>
                      <div className="d-flex aic gap-2">
                        <Check />
                        <p className="fs14" style={{ color: "#777777" }}>
                          {feature}
                        </p>
                      </div>
                      {index < subscription.features.length - 1 && (
                        <hr style={{ margin: 2 }} />
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  styles={{
                    height: "37px",
                  }}
                  className="d-flex aic jcc"
                  onClick={() => handleSelectPlan(subscription._id, subscription.amount)}
                  disabled={(loading && selected === subscription._id) || activePlan?.subscription?.name == subscription?.name}
                >
                  {loading && selected === subscription._id ? (
                    <p className="fs14 text-center">Loading... Please wait</p>
                  ) : (
                    activePlan?.subscription?.name == subscription?.name ? 'Active' : 'Join'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {successMessage && (
        <div className="alert alert-info mt-3">{successMessage}</div>
      )}
    </div>
  );
};

export default Subscription;
