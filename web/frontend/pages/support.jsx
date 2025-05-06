import { Page } from "@shopify/polaris";
import React from "react";
import Sidebar from "../components/Sidebar";

export default function Support() {
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
      <iframe
        title="Support Chat"
        src="https://tawk.to/chat/6810e04ba321df190d7ae61a/1iq0uo9vd"
        width="100%"
        height="90vh"
        style={{ border: "1px solid #ccc", borderRadius: 8}}
        allow="autoplay; encrypted-media"
      ></iframe>
      </Page>
      </main>
    </div>
  );
}