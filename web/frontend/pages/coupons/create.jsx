import { logo } from "../../assets";
import React, { useState, useCallback, useEffect } from 'react';  // Add useEffect import
import { useNavigate } from 'react-router-dom'; 
import Sidebar from '../../components/Sidebar';
import { 
  Layout, 
  Page, 
  Card, 
  RadioButton, 
  TextField, 
  Checkbox, 
  Select, 
  Button, 
  Stack,
  Text,
  Box,
  VerticalStack,
  Frame,
  Toast,
  ChoiceList
} from '@shopify/polaris';
import CustomButton from "../../components/form/Button";

export default function Create() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  
  // Existing state variables
  const [discountType, setDiscountType] = useState('percentage');
  const [percentageValue, setPercentageValue] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [couponName, setCouponName] = useState('');
  
  // Sender Eligibility
  const [senderRequireMinPurchase, setSenderRequireMinPurchase] = useState(false);
  const [senderMinPurchaseAmount, setSenderMinPurchaseAmount] = useState('');
  const [senderTimesPerUser, setSenderTimesPerUser] = useState(false);
  const [senderTimesValue, setSenderTimesValue] = useState('');
  const [senderNewCustomersOnly, setSenderNewCustomersOnly] = useState(false);

  // Recipient Eligibility
  const [recipientRequireMinPurchase, setRecipientRequireMinPurchase] = useState(false);
  const [recipientMinPurchaseAmount, setRecipientMinPurchaseAmount] = useState('');
  const [recipientTimesPerUser, setRecipientTimesPerUser] = useState(false);
  const [recipientTimesValue, setRecipientTimesValue] = useState('');
  const [recipientNewCustomersOnly, setRecipientNewCustomersOnly] = useState(false);

  // Sharing platforms
  const [shareWhatsapp, setShareWhatsapp] = useState(true);
  const [shareMessenger, setShareMessenger] = useState(true);
  const [shareEmail, setShareEmail] = useState(true);

  // Add new states for products
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [products, setProducts] = useState([]);
  
  // Product assignment
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  
  // Replace hardcoded product options with dynamic ones
  const productOptions = products.map(product => ({
    label: product.title,
    value: product.id
  }));

  const collectionOptions = collections.map(collection => ({
    label: collection.title,
    value: collection.id
  }));

  // Message customization
  const [customMessage, setCustomMessage] = useState('Hey! I just bought something from [Insert Store Name] - I got a [Insert Discount] off too. [Insert Link]');

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  };

  const toastMarkup = toastActive ? (
    <Toast 
      content={toastMessage} 
      error={toastError}
      onDismiss={toggleToast} 
    />
  ) : null;

  const handleSubmit = async () => {
    // Validate form
    if (!couponName) {
      showToast('Coupon name is required', true);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: couponName,
          discountType,
          percentageValue,
          fixedAmount,
          senderRequireMinPurchase,
          senderMinPurchaseAmount,
          senderTimesPerUser,
          senderTimesValue,
          senderNewCustomersOnly,
          recipientRequireMinPurchase,
          recipientMinPurchaseAmount,
          recipientTimesPerUser,
          recipientTimesValue,
          recipientNewCustomersOnly,
          shareWhatsapp,
          shareMessenger,
          shareEmail,
          productIds: selectedProducts,
          collectionIds: selectedCollections,
          customMessage
        }),
      });

      const data = await response.json();
      if (data.success) {
        showToast('Coupon created successfully');
        setTimeout(() => {
          navigate('/coupons');
        }, 500); // Small delay to allow user to see the success message
      } else {
        showToast(data.message || 'Error creating coupon', true);
      }
    } catch (error) {
      console.error('Failed to create coupon:', error);
      showToast('Failed to create coupon', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to fetch products
  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success && data.products) {
          setProducts(data.products);
        } else {
          showToast('Failed to load products', true);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Error loading products', true);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    fetchProductsData();
  }, []);

  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const fetchCollectionsData = async () => {
      try {
        setIsLoadingCollections(true);
        const response = await fetch('/api/collections');
        const data = await response.json();
        if (data.success && data.collections) {
          setCollections(data.collections);
        } else {
          showToast('Failed to load collections', true);
        }
      } catch (error) {
        showToast('Error loading collections', true);
      } finally {
        setIsLoadingCollections(false);
      }
    };
    fetchCollectionsData();
  }, []);

  return (
    <Frame>
      <div
        className="dashboard-container"
        style={{ display: "flex", minHeight: "100vh" }}
      >
        <Sidebar />
        <main
          className="main-content"
          style={{ flexGrow: 1, padding: "32px 32px 32px 0", marginLeft: 0 }}
        >
          <Page
            title="Create Coupon"
            primaryAction={
              <CustomButton 
                primary 
                onClick={handleSubmit} 
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </CustomButton>
            }
          >
            <Layout>
              <Layout.Section oneHalf>
                {/* Left Column */}
                <Card sectioned>
                  <VerticalStack gap="4">
                    <TextField
                      label="Coupon Name"
                      value={couponName}
                      onChange={setCouponName}
                      autoComplete="off"
                      required
                    />
                    <Text variant="headingMd">Discount Type</Text>
                    <RadioButton
                      label="Percentage"
                      checked={discountType === "percentage"}
                      id="percentage"
                      name="discount"
                      onChange={() => setDiscountType("percentage")}
                    />
                    {discountType === "percentage" && (
                      <TextField
                        type="number"
                        label="Percentage"
                        value={percentageValue}
                        onChange={setPercentageValue}
                        suffix="%"
                        autoComplete="off"
                      />
                    )}

                    <RadioButton
                      label="Fixed Amount"
                      checked={discountType === "fixed"}
                      id="fixed"
                      name="discount"
                      onChange={() => setDiscountType("fixed")}
                    />
                    {discountType === "fixed" && (
                      <TextField
                        type="number"
                        label="Fixed Amount"
                        value={fixedAmount}
                        onChange={setFixedAmount}
                        prefix="$"
                        autoComplete="off"
                      />
                    )}
                  </VerticalStack>
                </Card>

                <Box paddingBlock="4">
                  <Card sectioned>
                    <VerticalStack gap="4">
                      <Text variant="headingMd">Sender Eligibility</Text>

                      <Checkbox
                        label="Require minimum purchase"
                        checked={senderRequireMinPurchase}
                        onChange={setSenderRequireMinPurchase}
                      />
                      {senderRequireMinPurchase && (
                        <TextField
                          type="number"
                          label="Minimum purchase amount"
                          value={senderMinPurchaseAmount}
                          onChange={setSenderMinPurchaseAmount}
                          prefix="$"
                          autoComplete="off"
                        />
                      )}

                      <Checkbox
                        label="Number of times per user"
                        checked={senderTimesPerUser}
                        onChange={setSenderTimesPerUser}
                      />
                      {senderTimesPerUser && (
                        <TextField
                          type="number"
                          label="Number of times"
                          value={senderTimesValue}
                          onChange={setSenderTimesValue}
                          autoComplete="off"
                        />
                      )}

                      <Checkbox
                        label="Limit to new customers only"
                        checked={senderNewCustomersOnly}
                        onChange={setSenderNewCustomersOnly}
                      />
                    </VerticalStack>
                  </Card>
                </Box>

                <Box paddingBlock="4">
                  <Card sectioned>
                    <VerticalStack gap="4">
                      <Text variant="headingMd">Recipient Eligibility</Text>

                      <Checkbox
                        label="Require minimum purchase"
                        checked={recipientRequireMinPurchase}
                        onChange={setRecipientRequireMinPurchase}
                      />
                      {recipientRequireMinPurchase && (
                        <TextField
                          type="number"
                          label="Minimum purchase amount"
                          value={recipientMinPurchaseAmount}
                          onChange={setRecipientMinPurchaseAmount}
                          prefix="$"
                          autoComplete="off"
                        />
                      )}

                      <Checkbox
                        label="Number of times per user"
                        checked={recipientTimesPerUser}
                        onChange={setRecipientTimesPerUser}
                      />
                      {recipientTimesPerUser && (
                        <TextField
                          type="number"
                          label="Number of times"
                          value={recipientTimesValue}
                          onChange={setRecipientTimesValue}
                          autoComplete="off"
                        />
                      )}

                      <Checkbox
                        label="Limit to new customers only"
                        checked={recipientNewCustomersOnly}
                        onChange={setRecipientNewCustomersOnly}
                      />
                    </VerticalStack>
                  </Card>
                </Box>
              </Layout.Section>

              <Layout.Section oneHalf>
                {/* Right Column */}
                <Card sectioned>
                  <VerticalStack gap="4">
                    <Text variant="headingMd">Sharing Platforms</Text>

                    <Checkbox
                      label="WhatsApp"
                      checked={shareWhatsapp}
                      onChange={setShareWhatsapp}
                    />

                    <Checkbox
                      label="Messenger"
                      checked={shareMessenger}
                      onChange={setShareMessenger}
                    />

                    <Checkbox
                      label="Email"
                      checked={shareEmail}
                      onChange={setShareEmail}
                    />
                  </VerticalStack>
                </Card>

                <Box paddingBlock="4">
                  <Card sectioned>
                    <VerticalStack gap="4">
                      <ChoiceList
                        title="Assign Products"
                        choices={productOptions}
                        selected={selectedProducts}
                        onChange={setSelectedProducts}
                        allowMultiple
                        disabled={isLoadingProducts}
                      />
                      <ChoiceList
                        title="Assign Collections"
                        choices={collectionOptions}
                        selected={selectedCollections}
                        onChange={setSelectedCollections}
                        allowMultiple
                        disabled={isLoadingCollections}
                      />
                    </VerticalStack>
                  </Card>
                </Box>

                <Box paddingBlock="4">
                  <Card sectioned>
                    <VerticalStack gap="4">
                      <Text variant="headingMd">Customize Message</Text>
                      <TextField
                        label="Custom message"
                        value={customMessage}
                        onChange={setCustomMessage}
                        multiline={4}
                        autoComplete="off"
                      />

                      <Text variant="headingSm">Message Variables</Text>
                      <Stack distribution="fillEvenly">
                        <Box
                          padding="2"
                          background="bg-surface-secondary"
                          borderRadius="1"
                        >
                          <Text variant="bodySm">[Insert Store Name]</Text>
                        </Box>
                        <Box
                          padding="2"
                          background="bg-surface-secondary"
                          borderRadius="1"
                        >
                          <Text variant="bodySm">[Insert Discount]</Text>
                        </Box>
                        <Box
                          padding="2"
                          background="bg-surface-secondary"
                          borderRadius="1"
                        >
                          <Text variant="bodySm">[Insert Link]</Text>
                        </Box>
                      </Stack>
                    </VerticalStack>
                  </Card>
                </Box>
              </Layout.Section>
            </Layout>
          </Page>
          <div className="d-flex justify-content-end mt-4">
            <img src={logo} alt="share cart logo" width="200px" />
          </div>
        </main>
        {toastMarkup}
      </div>
    </Frame>
  );
}
