import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  Banner,
  Layout,
  Page,
  Card,
  DataTable,
  DatePicker,
  Button,
  Spinner,
  TextField,
  Stack,
} from "@shopify/polaris";

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleString();
}

export default function Activity() {
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [notification, setNotification] = useState(null);
  const [activities, setActivities] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  });
  const [showPicker, setShowPicker] = useState(false);

  // Fetch activities
  const fetchActivities = async () => {
    setLoadingActivity(true);
    setNotification(null);
    try {
      let url = "/analytics/coupon-activities";
      if (dateRange.start && dateRange.end) {
        url += `?startDate=${dateRange.start}&endDate=${dateRange.end}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
      } else {
        setNotification({ status: "critical", message: data.message });
      }
    } catch (err) {
      setNotification({ status: "critical", message: "Failed to load activities." });
    }
    setLoadingActivity(false);
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line
  }, []);

  // Handle date range filter
  const handleDateChange = (field) => (value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    fetchActivities();
  };

  const handleClearFilter = () => {
    setDateRange({ start: null, end: null });
    fetchActivities();
  };

  // DataTable rows
  const rows = activities.map((a) => [
    a.couponName || "-",
    a.couponCode || "-",
    a.sender || "-",
    a.receiver || "-",
    a.status.charAt(0).toUpperCase() + a.status.slice(1),
    a.orderValue ? `$${a.orderValue.toFixed(2)}` : "-",
    a.discountAmount ? `$${a.discountAmount.toFixed(2)}` : "-",
    formatDate(a.timestamp),
  ]);

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
            <Page title="Coupon Activity">
                {notification && (
                    <Banner status={notification.status} title={notification.message} />
                )}
                <Card sectioned>
                    <Stack alignment="end" spacing="tight">
                        <TextField
                            label="Start Date"
                            type="date"
                            value={dateRange.start || ""}
                            onChange={handleDateChange("start")}
                            autoComplete="off"
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            value={dateRange.end || ""}
                            onChange={handleDateChange("end")}
                            autoComplete="off"
                        />
                        <Button onClick={handleApplyFilter} primary>
                            Filter
                        </Button>
                        <Button onClick={handleClearFilter} disabled={!dateRange.start && !dateRange.end}>
                            Clear
                        </Button>
                    </Stack>
                </Card>
                <div style={{ marginTop: 24 }}>
                    {loadingActivity ? (
                        <Spinner accessibilityLabel="Loading activities" size="large" />
                    ) : (
                        <Card>
                            <DataTable
                                columnContentTypes={[
                                    "text", // Coupon Name
                                    "text", // Coupon Code
                                    "text", // Sender
                                    "text", // Receiver
                                    "text", // Status
                                    "numeric", // Order Value
                                    "numeric", // Discount Amount
                                    "text", // Time
                                ]}
                                headings={[
                                    "Coupon Name",
                                    "Coupon Code",
                                    "Sender",
                                    "Receiver",
                                    "Status",
                                    "Order Value",
                                    "Discount",
                                    "Time",
                                ]}
                                rows={rows}
                                footerContent={`Total: ${activities.length} activities`}
                            />
                        </Card>
                    )}
                </div>
            </Page>
        </main>
    </div>
);
}
