import React, { useState, useEffect } from "react";
import { Card, Page, Text, TextField, Banner, Spinner, Layout } from "@shopify/polaris";
import Sidebar from "../components/Sidebar";
import { Icon } from "@iconify/react";
import { logo } from "../assets";
import Button from "../components/form/Button";
import { useSelector } from "react-redux";

const DISPLAY_OPTIONS = [
  { label: "Pop-up when clicking add to cart", value: "add_to_cart" },
  { label: "Pop-up when clicking checkout", value: "checkout" },
  { label: "Cart page widget", value: "cart_page" },
  { label: "Product page widget", value: "product_page" },
];

const BUTTON_STYLE_OPTIONS = [
  { label: "Text + Logo (custom style)", value: "text_logo_custom" },
  { label: "Logo only (custom style)", value: "logo_custom" },
  { label: "Logo only (original branding)", value: "logo_original" },
];

const shopifyApiKey = import.meta.env.VITE_SHOPIFY_API_KEY;

// Update ShareButtons to accept coupon prop
const ShareButtons = ({ buttonStyle, direction = "row", colors, coupon }) => {
  // Determine which buttons to show
  const showEmail = coupon ? coupon.shareEmail : true;
  const showWhatsapp = coupon ? coupon.shareWhatsapp : true;
  const showMessenger = coupon ? coupon.shareMessenger : true;

  // Use coupon custom message or fallback
  const shareMessage = encodeURIComponent(
    coupon?.customMessage || "Check out my cart!"
  );

  // Custom button style
  const customButton = (icon, alt, text) => (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: colors?.button || "#32c6ce",
        color: colors?.buttonText || "#fff",
        border: "none",
        borderRadius: 8,
        padding: "8px 16px",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 10,
        width: direction === "column" ? "100%" : "auto", // Only full width for column
        minWidth: 0, // Allow shrinking
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      <Icon icon={icon} width={24} height={24} aria-label={alt} />
      {text && <span>{text}</span>}
    </button>
  );

  // Original brand icon style
  const brandIcon = (icon, alt, href, title) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none" }}
      title={title}
    >
      <Icon icon={icon} width={32} height={32} aria-label={alt} />
    </a>
  );

  const flexStyle = {
    display: "flex",
    gap: 16,
    marginTop: 16,
    flexDirection: direction,
    alignItems: direction === "column" ? "stretch" : "center",
  };

  // Helper to render buttons based on coupon
  const renderButtons = () => {
    const buttons = [];
    if (showEmail) {
      buttons.push(
        buttonStyle === "logo_original"
          ? brandIcon(
              "lsicon:email-send-filled",
              "Email",
              `mailto:?subject=${shareMessage}`,
              "Email"
            )
          : <a href={`mailto:?subject=${shareMessage}`} target="_blank" rel="noopener noreferrer">
              {customButton("mdi:email", "Email", buttonStyle === "text_logo_custom" ? "Email" : undefined)}
            </a>
      );
    }
    if (showWhatsapp) {
      buttons.push(
        buttonStyle === "logo_original"
          ? brandIcon(
              "logos:whatsapp-icon",
              "WhatsApp",
              `https://wa.me/?text=${shareMessage}`,
              "WhatsApp"
            )
          : <a href={`https://wa.me/?text=${shareMessage}`} target="_blank" rel="noopener noreferrer">
              {customButton("ic:baseline-whatsapp", "WhatsApp", buttonStyle === "text_logo_custom" ? "WhatsApp" : undefined)}
            </a>
      );
    }
    if (showMessenger) {
      buttons.push(
        buttonStyle === "logo_original"
          ? brandIcon(
              "logos:messenger",
              "Messenger",
              `https://m.me/?link=${shareMessage}`,
              "Messenger"
            )
          : <a href={`https://m.me/?link=${shareMessage}`} target="_blank" rel="noopener noreferrer">
              {customButton("cib:messenger", "Messenger", buttonStyle === "text_logo_custom" ? "Messenger" : undefined)}
            </a>
      );
    }
    return buttons;
  };

  return <div style={flexStyle}>{renderButtons()}</div>;
};

export default function Widget() {
  const subscription = useSelector(
    (state) => state.auth.subscription?.subscription
  );

  const filteredDisplayOptions = DISPLAY_OPTIONS.filter((options) => {
    // If not unlimited and we've reached the limit
    if (subscription?.permissions?.widget == 2) {
      return options.value !== "checkout" && options.value !== "product_page";
    }
    return options;
  });

  // State for settings
  const [display, setDisplay] = useState(["add_to_cart"]); // now array
  const [buttonStyle, setButtonStyle] = useState("text_logo_custom");
  const [text, setText] = useState(
    "Share your cart with a friend and you both get 15% off your orders"
  );
  const [colors, setColors] = useState({
    button: "#32c6ce",
    background: "#FBFBFB",
    buttonText: "#fff",
    text: "#212121",
  });

  // Add coupon state
  const [coupon, setCoupon] = useState(null);

  // Get allowed number from permissions (default to 1 if not set)
  const allowedDisplayCount = subscription?.permissions?.widget || 1;

  // Handle checkbox change
  const handleDisplayChange = (value) => {
    if (display.includes(value)) {
      setDisplay(display.filter((v) => v !== value));
    } else {
      if (display.length < allowedDisplayCount) {
        setDisplay([...display, value]);
      }
    }
  };

  // State for notification
  const [notification, setNotification] = useState(null);

  // State for loading
  const [saving, setSaving] = useState(false);

  // State for loading widget fetch
  const [loadingWidget, setLoadingWidget] = useState(true);

  const [shop, setShop] = useState("")

  // Fetch existing widget settings on mount
  useEffect(() => {
    async function fetchSettings() {
      setLoadingWidget(true);
      try {
        const res = await fetch("/api/widgets");
        const data = await res.json();
        if (data.success && data.widget) {
          setDisplay(
            Array.isArray(data.widget.display)
              ? data.widget.display
              : [data.widget.display || "add_to_cart"]
          );
          setButtonStyle(data.widget.buttonStyle || "text_logo_custom");
          setText(data.widget.text || "");
          setColors({
            button: data.widget.colors?.button || "#32c6ce",
            background: data.widget.colors?.background || "#FBFBFB",
            buttonText: data.widget.colors?.buttonText || "#fff",
            text: data.widget.colors?.text || "#212121",
          });
          setCoupon(data.widget.coupon || null);
          setShop(data.shop)
        }
      } catch (err) {
        setNotification({
          status: "critical",
          message: "Failed to load widget settings.",
        });
      }
      setLoadingWidget(false);
    }
    fetchSettings();
  }, []);

  // Add this function inside your Widget component
  

  // Handle color changes
  const handleColorChange = (key, value) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  // Save handler
 
  const handleSave = async () => {
    setSaving(true);
    try {

      const res = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display,
          buttonStyle,
          text,
          colors,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ status: "success", message: "Settings saved!" });
      } else {
        console.log("Failed to save settings", data);
        setNotification({
          status: "critical",
          message: data.message || "Failed to save settings.",
        });
      }
    } catch (err) {
      console.log('Failed to save settings', err)
      setNotification({
        status: "critical",
        message: "Failed to save settings.",
      });
    }
    setSaving(false);
    setTimeout(() => setNotification(null), 3000);
  };

  // In the preview section, pick the first selected display for preview:
  const previewDisplay = display[0] || "add_to_cart";


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
          {notification && (
            <Banner status={notification.status} title={notification.message} />
          )}

          {/* Shopify App Embed Onboarding */}
          <div style={{ marginBottom: 24 }}>
          <Card
            title="Enable Share Cart Widget in Your Theme"
            sectioned
            
          >
            <Text as="p" variant="bodyMd" style={{ marginBottom: 12 }}>
              To display the Share Cart widget on your storefront, you must enable the app embed block in your current Shopify theme.
            </Text>
            <ol style={{ marginBottom: 12, paddingLeft: 18 }}>
              <li>
                Adjust your widget settings below and click <b>Save</b>.
              </li>
              <li>
                After saving, click <b>Open Theme Editor</b> to open your theme editor with the Share Cart block highlighted.
              </li>
              <li>
                In the theme editor, toggle <b>Share Cart Widget</b> to <b>active</b>.
              </li>
              <li>
                Save your changes in the theme editor.
              </li>
            </ol>
            <Banner status="info" title="Changing themes?">
              <Text as="span" variant="bodySm">
                If you change or publish a new theme, you will need to re-enable the Share Cart app embed block for the new theme.
              </Text>
            </Banner>
            <Text as="p" variant="bodySm" color="subdued" style={{ marginTop: 12 }}>
              <b>Supported templates:</b> Product, Cart, and Checkout pages.
            </Text>
          </Card>
          </div>
          {/* End Shopify App Embed Onboarding */}

          {!loadingWidget && (
            <Layout>
              <Layout.Section oneHalf>
                <Card title="Customize Widget" sectioned>
                  {/* Display Option */}
                  <div style={{ marginBottom: 24 }}>
                    <Text variant="headingSm" as="h3">
                      Select Display (Choose up to {allowedDisplayCount})
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {DISPLAY_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            opacity:
                              display.length >= allowedDisplayCount &&
                              !display.includes(opt.value)
                                ? 0.5
                                : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            name="display"
                            value={opt.value}
                            checked={display.includes(opt.value)}
                            disabled={
                              display.length >= allowedDisplayCount &&
                              !display.includes(opt.value)
                            }
                            onChange={() => handleDisplayChange(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Text Option */}
                  <div style={{ marginBottom: 24 }}>
                    <Text variant="headingSm" as="h3">
                      Select Text
                    </Text>
                    <TextField
                      value={text}
                      onChange={setText}
                      multiline={2}
                      autoComplete="off"
                    />
                  </div>

                  {/* Appearance */}
                  <div style={{ marginBottom: 24 }}>
                    <Text variant="headingSm" as="h3">
                      Select Appearance
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        flexWrap: "wrap",
                        marginTop: 8,
                        justifyContent: "space-between",
                      }}
                    >
                      <div class="d-flex flex-column gap-2">
                        <label>Button Color</label>
                        <input
                          type="color"
                          value={colors.button}
                          onChange={(e) =>
                            handleColorChange("button", e.target.value)
                          }
                          style={{
                            width: 40,
                            height: 32,
                            border: "none",
                            marginLeft: 8,
                          }}
                        />
                      </div>
                      <div class="d-flex flex-column gap-2">
                        <label>Background Color</label>
                        <input
                          type="color"
                          value={colors.background}
                          onChange={(e) =>
                            handleColorChange("background", e.target.value)
                          }
                          style={{
                            width: 40,
                            height: 32,
                            border: "none",
                            marginLeft: 8,
                          }}
                        />
                      </div>
                      <div class="d-flex flex-column gap-2">
                        <label>Button Text</label>
                        <input
                          type="color"
                          value={colors.buttonText}
                          onChange={(e) =>
                            handleColorChange("buttonText", e.target.value)
                          }
                          style={{
                            width: 40,
                            height: 32,
                            border: "none",
                            marginLeft: 8,
                          }}
                        />
                      </div>
                      <div class="d-flex flex-column gap-2">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={colors.text}
                          onChange={(e) =>
                            handleColorChange("text", e.target.value)
                          }
                          style={{
                            width: 40,
                            height: 32,
                            border: "none",
                            marginLeft: 8,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Button Style */}
                  <div style={{ marginBottom: 24 }}>
                    <Text variant="headingSm" as="h3">
                      Select Button Style
                    </Text>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {BUTTON_STYLE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            type="radio"
                            name="buttonStyle"
                            value={opt.value}
                            checked={buttonStyle === opt.value}
                            onChange={() => setButtonStyle(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex jcfe aic" style={{ width: "100%" }}>
                    <Button
                      style={{ borderRadius: 8 }}
                      onClick={handleSave}
                      loading={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      primary
                      url={
                        `https://admin.shopify.com/store/${shop?.replace(".myshopify.com", "")}/themes/current/editor?enableAppEmbedId=${shopifyApiKey}::share-cart-widget`
                      }
                      external
                      style={{ marginLeft: 16 }}
                    >
                      Open Theme Editor
                    </Button>
                  </div>
                </Card>
              </Layout.Section>
              <Layout.Section oneHalf>
                <Card title="Widget Preview" sectioned>
                  {["add_to_cart", "checkout"].includes(previewDisplay) ? (
                    // Pop-up style preview
                    <div
                      style={{
                        background: colors.background,
                        borderRadius: 16,
                        padding: 32,
                        minHeight: 320,
                        width: 340,
                        margin: "0 auto",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 24,
                        position: "relative",
                      }}
                    >
                      <p
                        style={{
                          color: colors.text,
                          fontSize: 18,
                          marginBottom: 16,
                          textAlign: "center",
                        }}
                      >
                        {text}
                      </p>
                      <div className="d-flex jcc">
                        <ShareButtons
                          buttonStyle={buttonStyle}
                          direction="column"
                          colors={colors}
                          coupon={coupon}
                        />
                      </div>
                      <p
                        style={{
                          color: colors.text,
                          fontSize: 18,
                          marginBottom: 12,
                          textAlign: "center",
                          marginTop: 8,
                        }}
                      >
                        No thanks! I prefer not to get a discount
                      </p>
                    </div>
                  ) : (
                    // Page widget style preview
                    <div
                      style={{
                        background: colors.background,
                        borderRadius: 12,
                        padding: 24,
                        minHeight: 180,
                        width: "100%",
                        maxWidth: 500,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        display: "flex",
                        alignItems: "center",
                        gap: 24,
                        justifyContent: "center",
                        flexDirection: "column",
                        overflow: "auto", // Prevent overflow
                      }}
                    >
                      <div style={{ width: "100%" }}>
                        <p
                          style={{
                            color: colors.text,
                            fontSize: 18,
                            marginBottom: 12,
                            textAlign: "center",
                          }}
                        >
                          {text}
                        </p>
                        <div
                          className="d-flex jcc"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16,
                            justifyContent: "center",
                            width: "100%",
                            maxWidth: "100%",
                            boxSizing: "border-box",
                          }}
                        >
                          <ShareButtons
                            buttonStyle={buttonStyle}
                            direction="row"
                            colors={colors}
                            coupon={coupon}
                          />
                        </div>
                        <p
                          style={{
                            color: colors.text,
                            fontSize: 18,
                            marginBottom: 12,
                            textAlign: "center",
                            marginTop: 8,
                          }}
                        >
                          No thanks! I prefer not to get a discount
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </Layout.Section>
            </Layout>
          )}
        </Page>
        {/* <div className="d-flex justify-content-end mt-4">
          <img src={logo} alt="share cart logo" srcSet="" width="200px" />
        </div> */}
      </main>
    </div>
  );
}

