import React, { useState, useCallback, useEffect } from "react";
import { logo } from "../../assets";
import Sidebar from "../../components/Sidebar";
import {
  Layout,
  Page,
  Button,
  DataTable,
  Card,
  Popover,
  ActionList,
  Icon,
  Tooltip,
  TextField,
  Spinner,
  EmptyState,
  Banner,
  Modal,
  TextContainer,
  Toast,
  Frame,
} from "@shopify/polaris";
import { MobileVerticalDotsMajor, SearchMinor } from "@shopify/polaris-icons";
import { Icon as IconifyIcon } from "@iconify/react";
import CustomButton from "../../components/form/Button";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Coupons() {
  // States for coupons data
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search state
  const [searchValue, setSearchValue] = useState("");

  // State for managing popover visibility
  const [activeActionId, setActiveActionId] = useState(null);

  // States for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const subscription = useSelector(
    (state) => state.auth.subscription?.subscription
  );

  console.log("subscription", subscription);

  const navigate = useNavigate();

  // Add state for toast notifications
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [activatingCouponId, setActivatingCouponId] = useState(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activateError, setActivateError] = useState(null);

  // Fetch coupons when component mounts
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/coupons");
      const data = await response.json();

      if (data.success) {
        setCoupons(data.coupons);
      } else {
        setError(data.message || "Failed to load coupons");
      }
    } catch (error) {
      setError("An error occurred while fetching coupons");
      console.error("Error fetching coupons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle search input change
  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);

  // Toggle popover for action menu
  const togglePopover = (id) => {
    setActiveActionId(activeActionId === id ? null : id);
  };

  // Function to copy coupon code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        console.log("Copied to clipboard:", code);
        // You could add a toast notification here
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };

  // Filter coupons based on search term
  const filteredCoupons = coupons.filter((coupon) => {
    const searchLower = searchValue.toLowerCase();
    return (
      coupon.name.toLowerCase().includes(searchLower) ||
      coupon.code.toLowerCase().includes(searchLower) ||
      (coupon.usedBy && coupon.usedBy.toLowerCase().includes(searchLower))
    );
  });

  // Create rows with action menu and copy icon
  const rows = filteredCoupons.map((coupon, index) => {
    // Create code with copy button
    const codeWithCopy = (
      <div style={{ display: "flex", alignItems: "center" }}>
        {coupon.code}
        <Tooltip content="Copy code">
          <Button
            plain
            icon={<IconifyIcon icon="material-symbols:content-copy-outline" />}
            onClick={() => copyToClipboard(coupon.code)}
            accessibilityLabel="Copy coupon code"
          />
        </Tooltip>
      </div>
    );

    

    const actionContent = (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Popover
          active={activeActionId === index}
          activator={
            <Button
              plain
              icon={<Icon source={MobileVerticalDotsMajor} />}
              onClick={() => togglePopover(index)}
            />
          }
          onClose={() => setActiveActionId(null)}
        >
          <ActionList
            items={[
              {
                content: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IconifyIcon icon="mdi:eye-outline" />
                    <span>View</span>
                  </div>
                ),
                onAction: () => navigate(`/coupons/${coupon.id}`),
              },
              {
                content: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IconifyIcon icon="mdi:pencil-outline" />
                    <span>Edit</span>
                  </div>
                ),
                onAction: () =>
                  navigate("/coupons/edit", { state: { id: coupon.id } }),
              },
              {
                content: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IconifyIcon
                      icon="mdi:check-circle-outline"
                      color="#008060"
                    />
                    <span>Activate</span>
                  </div>
                ),
                onAction: () => handleActivateCoupon(coupon.id),
              },
              {
                content: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IconifyIcon icon="mdi:delete-outline" color="#d82c0d" />
                    <span>Delete</span>
                  </div>
                ),
                onAction: () => handleDeleteCoupon(coupon.id),
              },
            ]}
          />
        </Popover>
      </div>
    );

    // Add status badge
    const statusBadge = (
      <span
        style={{
          display: "inline-block",
          padding: "2px 10px",
          borderRadius: "12px",
          background: coupon.isActive ? "#E3F1DF" : "#FBEAE5",
          color: coupon.isActive ? "#008060" : "#d82c0d",
          fontWeight: 600,
          fontSize: "0.95em",
        }}
      >
        {coupon.isActive ? "Active" : "Inactive"}
      </span>
    );

    // Convert coupon object to array format for DataTable
    return [
      coupon.name,
      formatDate(coupon.createdAt),
      coupon.sentCount || "0",
      coupon.convertedCount || "0",
      coupon.usedBy || "No users yet",
      codeWithCopy,
      statusBadge,
      actionContent,
    ];
  });

  // Handle coupon deletion
  const handleDeleteCoupon = async (id) => {
    setDeletingCouponId(id);
    setDeleteModalOpen(true);
    setDeleteError(null);
  };

  // Handles the actual deletion when confirmed
  const confirmDelete = async () => {
    if (!deletingCouponId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/coupons/${deletingCouponId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        // Remove the deleted coupon from state
        setCoupons((prevCoupons) =>
          prevCoupons.filter((coupon) => coupon.id !== deletingCouponId)
        );

        // Close the modal
        setDeleteModalOpen(false);
        setDeletingCouponId(null);
      } else {
        setDeleteError(data.message || "Failed to delete coupon");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      setDeleteError("An error occurred while deleting the coupon");
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel deletion and close modal
  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDeletingCouponId(null);
    setDeleteError(null);
  };

  const handleActivateCoupon = (id) => {
    setActivatingCouponId(id);
    setActivateModalOpen(true);
    setActivateError(null);
  };

  const confirmActivate = async () => {
    if (!activatingCouponId) return;
    setIsActivating(true);
    setActivateError(null);
    try {
      const response = await fetch(`/api/coupons/${activatingCouponId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        setCoupons((prevCoupons) =>
          prevCoupons.map((coupon) =>
            coupon.id === activatingCouponId
              ? { ...coupon, isActive: true }
              : { ...coupon, isActive: false }
          )
        );
        setActivateModalOpen(false);
        setActivatingCouponId(null);
        setToastMessage("Coupon activated. All other coupons deactivated.");
        setToastActive(true);
      } else {
        setActivateError(data.message || "Failed to activate coupon");
      }
    } catch (error) {
      setActivateError("An error occurred while activating the coupon");
    } finally {
      setIsActivating(false);
    }
  };

  const cancelActivate = () => {
    setActivateModalOpen(false);
    setActivatingCouponId(null);
    setActivateError(null);
  };

  // Render loading, error, or empty states
  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "40px" }}
        >
          <Spinner accessibilityLabel="Loading coupons" size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <Banner status="critical">
          <p>{error}</p>
        </Banner>
      );
    }

    if (coupons.length === 0) {
      return (
        <EmptyState
          heading="Create your first coupon"
          action={{
            content: "Create Coupon",
            onAction: () => createCoupon(),
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Start creating shareable coupons for your customers</p>
        </EmptyState>
      );
    }

    return (
      <>
        <div style={{ padding: "16px" }}>
          <TextField
            label=""
            value={searchValue}
            onChange={handleSearchChange}
            prefix={<Icon source={SearchMinor} />}
            placeholder="Search coupons by name, code, or users"
            clearButton
            onClearButtonClick={() => setSearchValue("")}
          />
        </div>
        <DataTable
          columnContentTypes={[
            "text",    // Coupon Name
            "text",    // Date Created
            "numeric", // Sent
            "numeric", // Converted
            "text",    // Who Used
            "text",    // Code
            "text",    // Status
            "text",    // Action
          ]}
          headings={[
            "Coupon Name",
            "Date Created",
            "Sent",
            "Converted",
            "Who Used",
            "Code",
            "Status",
            "Action",
          ]}
          rows={rows}
        />
      </>
    );
  };

  const deleteModalMarkup = (
    <Modal
      open={deleteModalOpen}
      onClose={cancelDelete}
      title="Delete Coupon"
      primaryAction={{
        content: isDeleting ? "Deleting..." : "Delete",
        destructive: true,
        loading: isDeleting,
        onAction: confirmDelete,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: cancelDelete,
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to delete this coupon? This action cannot be
            undone.
          </p>
          {deleteError && (
            <Banner status="critical">
              <p>{deleteError}</p>
            </Banner>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  const activateModalMarkup = (
    <Modal
      open={activateModalOpen}
      onClose={cancelActivate}
      title="Activate Coupon"
      primaryAction={{
        content: isActivating ? "Activating..." : "Activate",
        onAction: confirmActivate,
        loading: isActivating,
      }}
      secondaryActions={[
        { content: "Cancel", onAction: cancelActivate },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to activate this coupon? <br />
            <b>All other coupons will be deactivated.</b>
          </p>
          {activateError && (
            <Banner status="critical">
              <p>{activateError}</p>
            </Banner>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  const createCoupon = () => {
    // Check if permissions is unlimited (-1, null, undefined, or Infinity)
    const isUnlimited = subscription?.permissions?.liveCoupons === -1 || 
                        subscription?.permissions?.liveCoupons === null ||
                        subscription?.permissions?.liveCoupons === undefined ||
                        subscription?.permissions?.liveCoupons === Infinity || 
                        subscription?.permissions?.liveCoupons === 'unlimited';
                        
    // If not unlimited and we've reached the limit
    if (!isUnlimited && subscription?.permissions?.liveCoupons <= coupons.length) {
      setToastMessage(`You've reached your limit of ${subscription?.permissions?.liveCoupons} coupons. Please upgrade your plan to create more.`);
      setToastActive(true);
      return;
    }
    
    // Otherwise, navigate to create page
    navigate("/coupons/create");
  };
  
  // Toast dismiss handler
  const dismissToast = () => {
    setToastActive(false);
  };

  // Toast component markup
  const toastMarkup = toastActive ? (
    <Toast 
      content={toastMessage} 
      onDismiss={dismissToast} 
      error={toastError} 
      duration={4500}
    />
  ) : null;
  
  return (
    <div
      className="dashboard-container"
      style={{ display: "flex", minHeight: "100vh" }}
    >
      <Sidebar />
      <Frame>
        <main
          className="main-content"
          style={{ flexGrow: 1, padding: "32px 32px 32px 0", marginLeft: 0 }}
        >
          <Page
            title="Coupons"
            primaryAction={
              <CustomButton
                className="bg-custom-primary"
                onClick={() => createCoupon()}
              >
                Create Coupon
              </CustomButton>
            }
          >
            <Layout>
              <Layout.Section>
                <Card>{renderContent()}</Card>
              </Layout.Section>
            </Layout>
          </Page>
          <div className="d-flex justify-content-end mt-4">
            <img src={logo} alt="share cart logo" width="200px" />
          </div>
          {deleteModalMarkup}
          {activateModalMarkup}
        </main>
        {toastMarkup}
      </Frame>
    </div>
  );
}
