import mongoose from 'mongoose';

const ShareSchema = new mongoose.Schema({
  // Store reference
  shop: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Coupon details
  couponId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coupon',
    required: true 
  },
  couponCode: { 
    type: String,
    required: true,
    index: true
  },
  
  // Sender information
  senderEmail: { 
    type: String,
    required: true 
  },
  senderName: { 
    type: String 
  },
  senderCustomerId: { 
    type: String 
  },
  
  // Recipient information
  recipientEmail: { 
    type: String,
    required: true 
  },
  recipientName: { 
    type: String 
  },
  
  // Sharing metadata
  platform: { 
    type: String, 
    enum: ['whatsapp', 'messenger', 'email'],
    required: true 
  },
  sharedAt: { 
    type: Date, 
    default: Date.now 
  },
  cartValue: { 
    type: Number 
  },
  
  // Status tracking
  opened: { 
    type: Boolean, 
    default: false 
  },
  openedAt: { 
    type: Date 
  },
  converted: { 
    type: Boolean, 
    default: false 
  },
  convertedAt: { 
    type: Date 
  }
});

// Add indexes for common queries
ShareSchema.index({ senderEmail: 1 });
ShareSchema.index({ recipientEmail: 1 });
ShareSchema.index({ couponCode: 1, senderEmail: 1 });
ShareSchema.index({ couponCode: 1, recipientEmail: 1 });

export default mongoose.model('Share', ShareSchema);