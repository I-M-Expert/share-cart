import mongoose from "mongoose";

const widgetSchema = mongoose.Schema(
  {
    shop: { type: String, required: true },
    display: { type: [String], default: ["add_to_cart"] }, // changed to array
    buttonStyle: { type: String, default: "text_logo_custom" },
    text: { type: String, default: "" },
    colors: {
      button: { type: String, default: "#00c2b9" },
      background: { type: String, default: "#FBFBFB" },
      buttonText: { type: String, default: "#fff" },
      text: { type: String, default: "#212121" },
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
  },
  { timestamps: true }
);

const Widget = mongoose.model("Widget", widgetSchema);
export default Widget;
