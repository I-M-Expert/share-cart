import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Card, Page, Layout, Text, Select } from "@shopify/polaris";
import { logo } from "../assets";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import BrushIcon from "../components/svgs/BrushIcon";
import { useNavigate } from "react-router-dom";
import CouponIcon from "../components/svgs/CouponIcon";


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Example data for charts
const lineData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Shares",
      data: [12, 19, 10, 17, 14, 20, 16],
      borderColor: "#51c9c0",
      backgroundColor: "rgba(81,201,192,0.1)",
      tension: 0.4,
    },
    {
      label: "Purchases",
      data: [8, 11, 7, 10, 9, 13, 11],
      borderColor: "#FBB105",
      backgroundColor: "rgba(251,177,5,0.1)",
      tension: 0.4,
    },
  ],
};

const barData = {
  labels: ["Email", "WhatsApp", "Messenger"],
  datasets: [
    {
      label: "Shares",
      data: [30, 20, 25, 15, 10],
      backgroundColor: [
        "#51c9c0",
        "#FBB105",
        "#34A853",
        "#1877F2",
        "#8884d8",
      ],
    },
  ],
};

const pieData = {
  labels: ["Sender", "Recipient"],
  datasets: [
    {
      data: [1400, 940],
      backgroundColor: ["#51c9c0", "#FBB105"],
    },
  ],
};

const filterOptions = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

export default function Dashboard() {
  const [filter, setFilter] = useState("7d");

  const navigate = useNavigate()

  // Example values (replace with real data)
  const shares = 120;
  const couponsUsed = 45;
  const revenue = "$2,340";


  useEffect(() => {
      
        if (!window.Tawk_API) {
          var s1 = document.createElement("script");
          s1.async = true;
          s1.src = "https://embed.tawk.to/6810e04ba321df190d7ae61a/1iq0uo9vd";
          s1.charset = "UTF-8";
          s1.setAttribute("crossorigin", "*");
          document.body.appendChild(s1);
        }
      }, []);

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
        <Page title="">
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 24,
            }}
          >
            <Select
              options={filterOptions}
              onChange={setFilter}
              value={filter}
              label=""
              labelHidden
              placeholder="Filter"
              style={{ minWidth: 180 }}
            />
          </div>
          <Layout>
            <Layout.Section>
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom: 32,
                  width: "100%",
                }}
                className="jcb"
              >
                <div style={{ flex: 1 }}>
                  <Card sectioned>
                    <p className="fw400 fs18 mb-3">Shares</p>
                    <p className="fw900 fs30">{shares}</p>
                  </Card>
                </div>
                <div style={{ flex: 1 }}>
                  <Card sectioned>
                    <p className="fw400 fs18 mb-3">Coupons Used</p>
                    <p className="fw900 fs30">{couponsUsed}</p>
                  </Card>
                </div>
                <div style={{ flex: 1 }}>
                  <Card sectioned>
                    <p className="fw400 fs18 mb-3">Revenue</p>
                    <p className="fw900 fs30">{revenue}</p>
                  </Card>
                </div>
              </div>
            </Layout.Section>
            <Layout.Section>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 320 }}>
                  <Card title="Shares & Purchases" sectioned>
                    <Line
                      data={lineData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: "top" } },
                        scales: { y: { beginAtZero: true } },
                      }}
                      height={220}
                    />
                  </Card>
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 320,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  <Card title="Share Performance by Channel" sectioned>
                    <Bar
                      data={barData}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                      }}
                      height={100}
                    />
                  </Card>
                  <Card title="Revenue by Sender/Recipient" sectioned>
                    <Pie
                      data={pieData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: "bottom" },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: $${value.toLocaleString()}`;
                              }
                            }
                          }
                        }
                      }}
                      height={100}
                    />
                  </Card>
                </div>
              </div>
            </Layout.Section>
          </Layout>

          <div className="d-flex flex-wrap jcb">
            <div
              className="d-flex aic jcb"
              style={{
                width: "100%",
                gap: 8,
                marginTop: 32,
              }}
            >
              {[
                {
                  name: "Customize Widget",
                  link: "/widget",
                  icon: <BrushIcon />,
                },
                {
                  name: "Create Coupons",
                  link: "/coupons",
                  icon: <CouponIcon />,
                },
                {
                  name: "Activities",
                  link: "/activity",
                  icon: <BrushIcon />,
                },
              ].map((item, index) => (
                <div
                  style={{
                    width: "100%",
                    border: "1px solid #d6d6d6",
                    padding: 8,
                    borderRadius: 8,
                    background: "#f9f9fc",
                    cursor : 'pointer'
                  }}
                  className="d-flex flex-grow-1 aic jcc gap-2"
                  onClick={() => navigate(item.link)}
                >
                  <div>{item.icon}</div>
                  <p className="fw600">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </Page>
        {/* <div className="d-flex justify-content-end mt-4">
          <img src={logo} alt="share cart logo" srcset="" width="200px" />
        </div> */}
      </main>
    </div>
  );
}
