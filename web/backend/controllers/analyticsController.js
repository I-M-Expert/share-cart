import { ShareEvent, CouponUsage } from '../models/Analytics.js';
import Coupon from '../models/Coupon.js';

// Record when a customer shares a cart
export const recordShareEvent = async (req, res) => {
  try {
    const { platform, couponCode, cartValue, customerId, senderEmail, recipientEmail } = req.body;
    const shop = req.query.shop || req.body.shop;

    if (!shop) {
      return res
        .status(400)
        .json({ success: false, message: "Shop identifier required" });
    }
    
    // Find coupon by code to get the ID
    let couponId = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, shop });
      if (coupon) {
        couponId = coupon._id;
        
        // Update coupon sent count
        await Coupon.findByIdAndUpdate(couponId, { $inc: { sentCount: 1 } });
        
        // Create Share record to track the sharing event
        if (senderEmail && recipientEmail) {
          await Share.create({
            shop,
            couponId,
            couponCode,
            senderEmail,
            recipientEmail,
            platform,
            sharedAt: new Date(),
            cartValue
          });
        }
      }
    }
    
    // Create share event
    const shareEvent = await ShareEvent.create({
      shop,
      platform,
      couponId,
      couponCode,
      cartValue,
      customerId,
      deviceType: req.headers['user-agent'],
    });
    
    return res.status(201).json({ success: true, shareEvent });
  } catch (error) {
    console.error('Error recording share event:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to record share event',
      error: error.message 
    });
  }
};

// Record when a coupon is used in an order
export const recordCouponUsage = async (req, res) => {
  try {
    const { couponCode, userType, orderValue, discountAmount, customerId, customerName } = req.body;
    
    
    const shop = req.query.shop || req.body.shop;

    let couponId = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, shop });
      if (coupon) {
        couponId = coupon._id;
        
        // Update coupon converted count
        await Coupon.findByIdAndUpdate(couponId, { 
          $inc: { convertedCount: 1 },
          $push: { 
            usedBy: { 
              customerId, 
              customerName, 
              usedAt: new Date() 
            } 
          }
        });
      }
    }
    
    const couponUsage = await CouponUsage.create({
      shop,
      couponId,
      couponCode,
      userType,
      orderValue,
      discountAmount,
      customerId,
      customerName
    });
    
    return res.status(201).json({ success: true, couponUsage });
  } catch (error) {
    console.error('Error recording coupon usage:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to record coupon usage',
      error: error.message
    });
  }
};

// Record public coupon usage
export const recordPublicCouponUsage = async (req, res) => {
  try {
    const { couponCode, shop } = req.body;
    
    if (!shop || !couponCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shop and coupon code are required' 
      });
    }
    
    // Find the coupon
    const coupon = await Coupon.findOne({ code: couponCode, shop });
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Coupon not found' 
      });
    }
    
    // Update base stats - the webhook will handle the full details
    await Coupon.findByIdAndUpdate(coupon._id, { 
      $inc: { convertedCount: 1 }
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Coupon usage recorded' 
    });
  } catch (error) {
    console.error('Error recording public coupon usage:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to record coupon usage',
      error: error.message 
    });
  }
};

// Get analytics data for dashboard
export const getDashboardAnalytics = async (req, res) => {
  try {
    // Get shop from session for security
    const session = res.locals.shopify?.session;
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Missing Session' });
    }
    const shop = req.query.shop || session.shop;
    
    const timeframe = req.query.timeframe || '7d';
    
    if (!shop) {
      return res.status(400).json({ success: false, message: 'Shop identifier required' });
    }
    
    // Calculate date range based on timeframe
    const endDate = new Date();
    let startDate = new Date();
    
    switch(timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    // Get total counts
    const totalShares = await ShareEvent.countDocuments({
      shop,
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    const couponsUsed = await CouponUsage.countDocuments({
      shop,
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Get revenue data
    const revenueData = await CouponUsage.aggregate([
      { 
        $match: { 
          shop, 
          timestamp: { $gte: startDate, $lte: endDate },
          orderValue: { $exists: true, $ne: null, $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$userType",
          totalRevenue: { $sum: "$orderValue" }
        }
      }
    ]);
    
    // Format revenue by user type (sender/recipient)
    const revenueByUserType = {
      sender: 0,
      recipient: 0
    };
    
    revenueData.forEach(item => {
      if (item._id && (item._id === 'sender' || item._id === 'recipient')) {
        revenueByUserType[item._id] = parseFloat(item.totalRevenue.toFixed(2));
      }
    });
    
    // Get share counts by platform
    const sharesByPlatform = await ShareEvent.aggregate([
      {
        $match: {
          shop,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$platform",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format platform data
    const platformData = {
      whatsapp: 0,
      messenger: 0,
      email: 0
    };
    
    sharesByPlatform.forEach(item => {
      if (item._id) {
        platformData[item._id] = item.count;
      }
    });
    
    // Get daily share and purchase data
    const dailyShares = await getTimeSeriesData(ShareEvent, shop, startDate, endDate);
    const dailyPurchases = await getTimeSeriesData(CouponUsage, shop, startDate, endDate);
    
    // Calculate total revenue
    const totalRevenue = revenueByUserType.sender + revenueByUserType.recipient;
    
    return res.status(200).json({
      success: true,
      data: {
        shares: totalShares,
        couponsUsed,
        revenue: `$${totalRevenue.toFixed(2)}`,
        revenueByUserType,
        sharesByPlatform: platformData,
        dailyShares,
        dailyPurchases
      }
    });
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve analytics data',
      error: error.message
    });
  }
};

// Helper function to get time series data
const getTimeSeriesData = async (Model, shop, startDate, endDate) => {
  // For daily data
  const timeSeriesData = await Model.aggregate([
    {
      $match: {
        shop,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);
  
  // Format into array with dates and counts
  const formattedData = timeSeriesData.map(item => {
    const date = new Date(item._id.year, item._id.month - 1, item._id.day);
    return {
      date: date.toISOString().split('T')[0],
      count: item.count
    };
  });
  
  return formattedData;
};

// Get coupon activities with optional date range
export const getCouponActivities = async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session) {
      return res.status(401).json({ success: false, message: "Unauthorized - Missing Session" });
    }
    const shop = req.query.shop || session.shop;
    if (!shop) {
      return res.status(400).json({ success: false, message: "Shop identifier required" });
    }

    const { startDate, endDate } = req.query;
    const filter = { shop };
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Populate coupon code and name
    const activities = await CouponUsage.find(filter)
      .sort({ timestamp: -1 })
      .populate({ path: "couponId", select: "name code" })
      .lean();

    const formatted = activities.map((a) => ({
      id: a._id,
      sender: a.userType === "sender" ? a.customerName : "",
      receiver: a.userType === "recipient" ? a.customerName : "",
      status: a.userType,
      orderValue: a.orderValue,
      discountAmount: a.discountAmount,
      couponName: a.couponId?.name || "",
      couponCode: a.couponCode,
      timestamp: a.timestamp,
    }));

    res.json({ success: true, activities: formatted });
  } catch (error) {
    console.error("Error fetching coupon activities:", error);
    res.status(500).json({ success: false, message: "Failed to fetch activities" });
  }
};